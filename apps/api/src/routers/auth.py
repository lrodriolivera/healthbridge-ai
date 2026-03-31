"""Auth router — login, register, me, refresh with security hardening"""

import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.rate_limiter import get_client_key, rate_limiter
from src.models.tenant import Tenant
from src.models.user import User
from src.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from src.schemas.user import UserResponse
from src.utils.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)

router = APIRouter()


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return slug[:100]


def _build_token(user: User) -> str:
    return create_access_token(
        {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    )


def _validate_password(password: str):
    """Validate password meets minimum requirements."""
    if len(password) < settings.min_password_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password must be at least {settings.min_password_length} characters",
        )
    if not re.search(r"[A-Za-z]", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one letter",
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one number",
        )


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Public registration is DISABLED. Use /api/v1/admin/tenants to create accounts.
    This endpoint only works if no users exist yet (initial setup)."""
    rate_limiter.check(get_client_key(request, "register"), max_attempts=10, window_seconds=300)

    # Check if any users exist — only allow self-registration for first user
    from sqlalchemy import func
    user_count = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration disabled. Contact the platform administrator to create your account.",
        )

    _validate_password(body.password)

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    slug = _slugify(body.tenant_name)
    existing_tenant = await db.execute(select(Tenant).where(Tenant.slug == slug))
    if existing_tenant.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization name already taken")

    # First user gets enterprise plan
    tenant = Tenant(name=body.tenant_name, slug=slug, plan="enterprise")
    db.add(tenant)
    await db.flush()

    user = User(
        tenant_id=tenant.id,
        email=body.email,
        password_hash=get_password_hash(body.password),
        role="admin",
    )
    db.add(user)
    await db.flush()

    token = _build_token(user)
    response = Response(
        content=TokenResponse(access_token=token).model_dump_json(),
        media_type="application/json",
    )
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    return response


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    rate_limiter.check(
        get_client_key(request, "login"),
        max_attempts=settings.login_rate_limit,
        window_seconds=60,
    )

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = _build_token(user)
    response = Response(
        content=TokenResponse(access_token=token).model_dump_json(),
        media_type="application/json",
    )
    # Set httpOnly cookie for browser security (XSS protection)
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    return response


@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Send password reset email. Always returns 200 to prevent email enumeration."""
    from pydantic import BaseModel

    class ForgotRequest(BaseModel):
        email: str

    body = ForgotRequest(**(await request.json()))
    rate_limiter.check(get_client_key(request, "forgot"), max_attempts=3, window_seconds=300)

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        # Generate reset token (JWT with short expiry)
        from datetime import timedelta
        reset_token = create_access_token(
            {"sub": str(user.id), "type": "reset"},
            expires_delta=timedelta(hours=1),
        )
        from src.services.email_service import email_service
        await email_service.send_password_reset(
            user.email, reset_token, f"{settings.app_url}/reset-password"
        )

    return {"status": "ok", "message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(request: Request, db: AsyncSession = Depends(get_db)):
    """Reset password using token from email."""
    from pydantic import BaseModel

    class ResetRequest(BaseModel):
        token: str
        new_password: str

    body = ResetRequest(**(await request.json()))
    _validate_password(body.new_password)

    payload = decode_access_token(body.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")

    user.password_hash = get_password_hash(body.new_password)
    await db.flush()

    return {"status": "ok", "message": "Password reset successfully. You can now login."}


@router.post("/logout")
async def logout():
    """Clear auth cookie."""
    response = Response(content='{"status":"ok"}', media_type="application/json")
    response.delete_cookie("auth_token", path="/")
    return response


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_access_token(body.token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    # Only allow refresh if token expires within the next 30 minutes
    import time
    exp = payload.get("exp", 0)
    now = time.time()
    time_until_expiry = exp - now

    if time_until_expiry > 1800:  # More than 30 min left
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token still valid. Refresh only when close to expiry.",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    token = _build_token(user)
    response = Response(
        content=TokenResponse(access_token=token).model_dump_json(),
        media_type="application/json",
    )
    response.set_cookie(
        key="auth_token", value=token, httponly=True,
        secure=settings.environment == "production",
        samesite="lax", max_age=settings.access_token_expire_minutes * 60, path="/",
    )
    return response

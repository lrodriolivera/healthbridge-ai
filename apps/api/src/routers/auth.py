"""Auth router — login, register, me, refresh with security hardening"""

import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
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
    rate_limiter.check(get_client_key(request, "register"), max_attempts=10, window_seconds=300)
    _validate_password(body.password)

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    slug = _slugify(body.tenant_name)
    existing_tenant = await db.execute(select(Tenant).where(Tenant.slug == slug))
    if existing_tenant.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization name already taken")

    tenant = Tenant(name=body.tenant_name, slug=slug)
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

    return TokenResponse(access_token=_build_token(user))


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

    return TokenResponse(access_token=_build_token(user))


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_access_token(body.token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(access_token=_build_token(user))

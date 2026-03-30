"""Settings router — tenant settings and user profile management"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings as app_settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.tenant import Tenant
from src.models.user import User
from src.schemas.settings import (
    TenantSettings,
    TenantSettingsResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from src.utils.security import get_password_hash, verify_password

router = APIRouter()

AVAILABLE_MODELS = [
    {"id": "us.anthropic.claude-opus-4-6-v1", "name": "Claude Opus 4.6", "tier": "premium"},
    {"id": "us.anthropic.claude-sonnet-4-6", "name": "Claude Sonnet 4.6", "tier": "standard"},
    {"id": "us.anthropic.claude-sonnet-4-5-20250929-v1:0", "name": "Claude Sonnet 4.5", "tier": "standard"},
    {"id": "us.anthropic.claude-haiku-4-5-20251001-v1:0", "name": "Claude Haiku 4.5", "tier": "fast"},
]


@router.get("/tenant")
async def get_tenant_settings(
    tenant: Tenant = Depends(get_current_tenant),
):
    raw = tenant.settings or {}
    return TenantSettingsResponse(
        settings=TenantSettings(**{k: v for k, v in raw.items() if k in TenantSettings.model_fields}),
        tenant_name=tenant.name,
        tenant_slug=tenant.slug,
    )


@router.put("/tenant")
async def update_tenant_settings(
    body: TenantSettings,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update settings")

    updated = {**tenant.settings, **body.model_dump(exclude_unset=True)}
    tenant.settings = updated
    await db.flush()

    return TenantSettingsResponse(
        settings=TenantSettings(**{k: v for k, v in updated.items() if k in TenantSettings.model_fields}),
        tenant_name=tenant.name,
        tenant_slug=tenant.slug,
    )


@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        tenant_name=tenant.name,
    )


@router.put("/profile")
async def update_profile(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password required to change password")
        if not verify_password(body.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.password_hash = get_password_hash(body.new_password)

    if body.email:
        current_user.email = body.email

    await db.flush()
    return {"status": "updated"}


@router.get("/models")
async def list_available_models():
    return {
        "models": AVAILABLE_MODELS,
        "current": {
            "analysis": app_settings.analysis_model,
            "codegen": app_settings.default_model,
            "high_complexity": app_settings.high_complexity_model,
        },
    }

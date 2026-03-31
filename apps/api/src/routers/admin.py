"""Admin router — user/tenant management (super admin only)"""

import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.tenant import Tenant
from src.models.tenant_plan import PLANS, get_plan
from src.models.user import User
from src.utils.security import create_access_token, get_password_hash

router = APIRouter()

# Super admin email — only this user can create tenants/users
SUPER_ADMIN_EMAIL = "luis@hospital.com"


def _require_super_admin(user: User):
    if user.email != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Only platform admin can perform this action")


# --- Schemas ---

class CreateTenantRequest(BaseModel):
    tenant_name: str
    admin_email: EmailStr
    admin_password: str
    plan: str = "trial"  # trial, starter, professional, enterprise
    trial_days: int | None = None  # Override default trial duration


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "member"  # admin, member, viewer
    tenant_id: uuid.UUID


class UpdateTenantPlanRequest(BaseModel):
    plan: str
    trial_days: int | None = None


class TenantListItem(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    is_active: bool
    trial_expires_at: str | None
    user_count: int
    created_at: str


# --- Endpoints ---

@router.get("/tenants")
async def list_tenants(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tenants (super admin only)."""
    try:
        _require_super_admin(current_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auth error: {str(e)[:200]}")

    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    tenants = result.scalars().all()

    items = []
    for t in tenants:
        user_count = (await db.execute(
            select(func.count()).select_from(User).where(User.tenant_id == t.id)
        )).scalar_one()
        items.append({
            "id": str(t.id), "name": t.name, "slug": t.slug,
            "plan": t.plan, "is_active": t.is_active,
            "trial_expires_at": t.trial_expires_at.isoformat() if t.trial_expires_at else None,
            "user_count": user_count,
            "created_at": t.created_at.isoformat(),
        })

    return {"items": items, "total": len(items), "plans": PLANS}


@router.post("/tenants")
async def create_tenant(
    body: CreateTenantRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tenant with admin user (super admin only)."""
    import traceback
    try:
        return await _create_tenant_impl(body, current_user, db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {type(e).__name__}: {str(e)[:200]}")


async def _create_tenant_impl(body, current_user, db):
    _require_super_admin(current_user)

    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Options: {', '.join(PLANS.keys())}")

    # Slugify
    slug = re.sub(r"[^\w\s-]", "", body.tenant_name.lower().strip())
    slug = re.sub(r"[\s_]+", "-", slug)[:100]

    existing = await db.execute(select(Tenant).where(Tenant.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Organization name already taken")

    existing_email = await db.execute(select(User).where(User.email == body.admin_email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    plan_config = get_plan(body.plan)
    trial_days = body.trial_days or plan_config.get("trial_days")
    trial_expires = None
    if trial_days:
        trial_expires = datetime.now(timezone.utc) + timedelta(days=trial_days)

    tenant = Tenant(
        name=body.tenant_name, slug=slug,
        plan=body.plan, is_active=True,
        trial_expires_at=trial_expires,
    )
    db.add(tenant)
    await db.flush()

    user = User(
        tenant_id=tenant.id,
        email=body.admin_email,
        password_hash=get_password_hash(body.admin_password),
        role="admin",
    )
    db.add(user)
    await db.flush()

    return {
        "tenant_id": str(tenant.id),
        "tenant_name": tenant.name,
        "plan": tenant.plan,
        "trial_expires_at": trial_expires.isoformat() if trial_expires else None,
        "admin_email": body.admin_email,
        "limits": plan_config,
    }


@router.put("/tenants/{tenant_id}/plan")
async def update_tenant_plan(
    tenant_id: uuid.UUID,
    body: UpdateTenantPlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change tenant plan (super admin only)."""
    _require_super_admin(current_user)

    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {body.plan}")

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.plan = body.plan
    plan_config = get_plan(body.plan)
    trial_days = body.trial_days or plan_config.get("trial_days")

    if trial_days:
        tenant.trial_expires_at = datetime.now(timezone.utc) + timedelta(days=trial_days)
    else:
        tenant.trial_expires_at = None

    await db.flush()
    return {"tenant_id": str(tenant.id), "plan": tenant.plan, "trial_expires_at": tenant.trial_expires_at}


@router.put("/tenants/{tenant_id}/toggle-active")
async def toggle_tenant_active(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Activate/deactivate a tenant (super admin only)."""
    _require_super_admin(current_user)

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.is_active = not tenant.is_active
    await db.flush()
    return {"tenant_id": str(tenant.id), "is_active": tenant.is_active}


@router.post("/users")
async def create_user(
    body: CreateUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a user in a specific tenant (super admin only)."""
    _require_super_admin(current_user)

    # Check tenant exists
    tenant = (await db.execute(select(Tenant).where(Tenant.id == body.tenant_id))).scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Check user limit
    plan = get_plan(tenant.plan)
    if plan.get("max_users"):
        user_count = (await db.execute(
            select(func.count()).select_from(User).where(User.tenant_id == tenant.id)
        )).scalar_one()
        if user_count >= plan["max_users"]:
            raise HTTPException(status_code=400, detail=f"User limit reached ({plan['max_users']}). Upgrade plan.")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        tenant_id=body.tenant_id,
        email=body.email,
        password_hash=get_password_hash(body.password),
        role=body.role,
    )
    db.add(user)
    await db.flush()

    return {"user_id": str(user.id), "email": user.email, "role": user.role, "tenant": tenant.name}


@router.get("/plans")
async def list_plans():
    """List available plans with limits."""
    return {"plans": PLANS}

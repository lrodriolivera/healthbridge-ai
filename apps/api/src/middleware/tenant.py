"""Tenant context dependency — provides tenant-scoped access with plan enforcement"""

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.plan_enforcer import enforce_tenant_active
from src.models.tenant import Tenant
from src.models.user import User


async def get_current_tenant(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Tenant:
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant not found or access denied",
        )

    # Check tenant is active and trial not expired
    enforce_tenant_active(tenant)

    return tenant

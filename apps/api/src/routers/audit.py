"""Audit log router — view audit trail"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.audit_log import AuditLog
from src.models.tenant import Tenant
from src.models.user import User
from src.schemas.audit_log import AuditLogListResponse, AuditLogResponse

router = APIRouter()


@router.get("/", response_model=AuditLogListResponse)
async def list_audit_logs(
    resource_type: str | None = Query(None),
    action: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).where(AuditLog.tenant_id == tenant.id)
    count_query = select(func.count()).select_from(AuditLog).where(AuditLog.tenant_id == tenant.id)

    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
        count_query = count_query.where(AuditLog.resource_type == resource_type)
    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)

    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    )
    return AuditLogListResponse(items=result.scalars().all(), total=total)


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuditLog).where(AuditLog.id == log_id, AuditLog.tenant_id == tenant.id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log

"""IRIS Connections router — CRUD + test connectivity"""

import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.iris_connection import IRISConnection
from src.models.tenant import Tenant
from src.models.user import User
from src.schemas.iris_connection import (
    IRISConnectionCreate,
    IRISConnectionListResponse,
    IRISConnectionResponse,
    IRISConnectionUpdate,
    IRISTestResult,
)
from src.services.iris.atelier_client import AtelierClient

router = APIRouter()


@router.get("", response_model=IRISConnectionListResponse)
async def list_connections(
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(IRISConnection).where(
            IRISConnection.tenant_id == tenant.id
        )
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(IRISConnection)
        .where(IRISConnection.tenant_id == tenant.id)
        .order_by(IRISConnection.created_at.desc())
    )
    return IRISConnectionListResponse(items=result.scalars().all(), total=total)


@router.post("", response_model=IRISConnectionResponse, status_code=201)
async def create_connection(
    body: IRISConnectionCreate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conn = IRISConnection(
        tenant_id=tenant.id,
        name=body.name,
        base_url=body.base_url.rstrip("/"),
        namespace=body.namespace,
        credentials={"username": body.username, "password": body.password},
        ssl_verify=body.ssl_verify,
        environment=body.environment,
    )
    db.add(conn)
    await db.flush()
    await db.refresh(conn)
    return conn


@router.put("/{connection_id}", response_model=IRISConnectionResponse)
async def update_connection(
    connection_id: uuid.UUID,
    body: IRISConnectionUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(IRISConnection).where(
            IRISConnection.id == connection_id,
            IRISConnection.tenant_id == tenant.id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    update_data = body.model_dump(exclude_unset=True)

    # Handle credential updates separately
    if "username" in update_data or "password" in update_data:
        creds = dict(conn.credentials)
        if "username" in update_data:
            creds["username"] = update_data.pop("username")
        if "password" in update_data:
            creds["password"] = update_data.pop("password")
        conn.credentials = creds

    for field, value in update_data.items():
        setattr(conn, field, value)

    await db.flush()
    await db.refresh(conn)
    return conn


@router.delete("/{connection_id}", status_code=204)
async def delete_connection(
    connection_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(IRISConnection).where(
            IRISConnection.id == connection_id,
            IRISConnection.tenant_id == tenant.id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)


@router.post("/{connection_id}/test", response_model=IRISTestResult)
async def test_connection(
    connection_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(IRISConnection).where(
            IRISConnection.id == connection_id,
            IRISConnection.tenant_id == tenant.id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    client = AtelierClient(
        base_url=conn.base_url,
        namespace=conn.namespace,
        username=conn.credentials.get("username", ""),
        password=conn.credentials.get("password", ""),
        ssl_verify=conn.ssl_verify,
    )

    start = time.time()
    test_result = await client.test_connection()
    elapsed_ms = int((time.time() - start) * 1000)

    # Update health check timestamp
    conn.last_health_check = datetime.now(timezone.utc)
    await db.flush()

    return IRISTestResult(
        connected=test_result.get("connected", False),
        status_code=test_result.get("status_code"),
        error=test_result.get("error"),
        response_time_ms=elapsed_ms,
    )

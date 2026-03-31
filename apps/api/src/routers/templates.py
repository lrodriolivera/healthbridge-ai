"""Template Library router — share and reuse ObjectScript patterns"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.shared_template import SharedTemplate
from src.models.tenant import Tenant
from src.models.user import User

router = APIRouter()


class TemplateCreate(BaseModel):
    name: str
    description: str | None = None
    iris_layer: str  # BS, BP, BO, DTL, MSG
    template_type: str  # mllp_service, soap_operation, hl7_router, etc.
    code: str
    tags: list[str] = []
    is_public: bool = False


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    code: str | None = None
    tags: list[str] | None = None
    is_public: bool | None = None


class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: str | None
    iris_layer: str
    template_type: str
    code: str
    tags: list
    usage_count: int
    is_public: bool
    created_at: str


@router.get("")
async def list_templates(
    layer: str | None = Query(None),
    tag: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """List templates: own tenant + public templates."""
    base_filter = or_(SharedTemplate.tenant_id == tenant.id, SharedTemplate.is_public == True)

    query = select(SharedTemplate).where(base_filter)
    count_query = select(func.count()).select_from(SharedTemplate).where(base_filter)

    if layer:
        query = query.where(SharedTemplate.iris_layer == layer)
        count_query = count_query.where(SharedTemplate.iris_layer == layer)
    if tag:
        query = query.where(SharedTemplate.tags.contains([tag]))
        count_query = count_query.where(SharedTemplate.tags.contains([tag]))
    if search:
        search_filter = or_(
            SharedTemplate.name.ilike(f"%{search}%"),
            SharedTemplate.description.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(SharedTemplate.usage_count.desc()).offset(skip).limit(limit)
    )
    return {"items": result.scalars().all(), "total": total}


@router.post("", status_code=201)
async def create_template(
    body: TemplateCreate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = SharedTemplate(
        tenant_id=tenant.id,
        name=body.name, description=body.description,
        iris_layer=body.iris_layer, template_type=body.template_type,
        code=body.code, tags=body.tags, is_public=body.is_public,
        created_by=current_user.id,
    )
    db.add(t)
    await db.flush()
    await db.refresh(t)
    return t


@router.get("/{template_id}")
async def get_template(
    template_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SharedTemplate).where(
            SharedTemplate.id == template_id,
            or_(SharedTemplate.tenant_id == tenant.id, SharedTemplate.is_public == True),
        )
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")

    # Increment usage count
    t.usage_count += 1
    await db.flush()
    return t


@router.put("/{template_id}")
async def update_template(
    template_id: uuid.UUID,
    body: TemplateUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SharedTemplate).where(
            SharedTemplate.id == template_id, SharedTemplate.tenant_id == tenant.id,
        )
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(t, field, value)
    await db.flush()
    await db.refresh(t)
    return t


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SharedTemplate).where(
            SharedTemplate.id == template_id, SharedTemplate.tenant_id == tenant.id,
        )
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(t)

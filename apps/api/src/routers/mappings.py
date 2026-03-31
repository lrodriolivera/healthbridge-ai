"""Mappings router — CRUD + auto-generate + graph for React Flow"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.mapping import Mapping
from src.models.project import Project
from src.models.source_component import SourceComponent
from src.models.tenant import Tenant
from src.models.user import User
from src.routers.deps import get_project_for_tenant
from src.schemas.mapping import (
    MappingCreate,
    MappingGraphEdge,
    MappingGraphNode,
    MappingGraphResponse,
    MappingListResponse,
    MappingResponse,
    MappingUpdate,
)
from src.services.mapping_generator import generate_mappings_for_component

router = APIRouter()


@router.get("/{project_id}/mappings", response_model=MappingListResponse)
async def list_mappings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(Mapping).where(
            Mapping.project_id == project.id, Mapping.tenant_id == tenant.id
        )
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Mapping)
        .where(Mapping.project_id == project.id, Mapping.tenant_id == tenant.id)
        .order_by(Mapping.iris_layer, Mapping.target_class_name)
        .offset(skip)
        .limit(limit)
    )
    return MappingListResponse(items=result.scalars().all(), total=total)


@router.post("/{project_id}/mappings", response_model=MappingResponse, status_code=201)
async def create_mapping(
    body: MappingCreate,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mapping = Mapping(
        project_id=project.id,
        tenant_id=tenant.id,
        source_component_id=body.source_component_id,
        target_class_name=body.target_class_name,
        target_type=body.target_type,
        target_extends=body.target_extends,
        iris_layer=body.iris_layer,
        settings=body.settings,
        notes=body.notes,
        auto_generated=False,
    )
    db.add(mapping)
    await db.flush()
    await db.refresh(mapping)
    return mapping


@router.put("/{project_id}/mappings/{mapping_id}", response_model=MappingResponse)
async def update_mapping(
    mapping_id: uuid.UUID,
    body: MappingUpdate,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Mapping).where(
            Mapping.id == mapping_id,
            Mapping.project_id == project.id,
            Mapping.tenant_id == tenant.id,
        )
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(mapping, field, value)

    await db.flush()
    await db.refresh(mapping)
    return mapping


@router.delete("/{project_id}/mappings/{mapping_id}", status_code=204)
async def delete_mapping(
    mapping_id: uuid.UUID,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Mapping).where(
            Mapping.id == mapping_id,
            Mapping.project_id == project.id,
            Mapping.tenant_id == tenant.id,
        )
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    await db.delete(mapping)


@router.post("/{project_id}/mappings/auto-generate", response_model=MappingListResponse)
async def auto_generate_mappings(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get analyzed components
    result = await db.execute(
        select(SourceComponent).where(
            SourceComponent.project_id == project.id,
            SourceComponent.tenant_id == tenant.id,
            SourceComponent.status == "analyzed",
        )
    )
    components = result.scalars().all()

    if not components:
        raise HTTPException(status_code=400, detail="No analyzed components found")

    all_mappings = []
    for component in components:
        mappings = generate_mappings_for_component(
            component, project.id, tenant.id, project.source_platform
        )
        for m in mappings:
            m.confirmed_by = current_user.id  # Auto-confirm all generated mappings
            db.add(m)
        all_mappings.extend(mappings)

    await db.flush()
    for m in all_mappings:
        await db.refresh(m)

    return MappingListResponse(items=all_mappings, total=len(all_mappings))


@router.post("/{project_id}/mappings/confirm-all", response_model=MappingListResponse)
async def confirm_all_mappings(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm all unconfirmed mappings at once."""
    result = await db.execute(
        select(Mapping).where(
            Mapping.project_id == project.id,
            Mapping.tenant_id == tenant.id,
            Mapping.confirmed_by.is_(None),
        )
    )
    unconfirmed = result.scalars().all()

    for m in unconfirmed:
        m.confirmed_by = current_user.id

    await db.flush()
    for m in unconfirmed:
        await db.refresh(m)

    return MappingListResponse(items=unconfirmed, total=len(unconfirmed))


@router.post("/{project_id}/mappings/{mapping_id}/confirm", response_model=MappingResponse)
async def confirm_mapping(
    mapping_id: uuid.UUID,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Mapping).where(
            Mapping.id == mapping_id,
            Mapping.project_id == project.id,
            Mapping.tenant_id == tenant.id,
        )
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    mapping.confirmed_by = current_user.id
    await db.flush()
    await db.refresh(mapping)
    return mapping


@router.get("/{project_id}/mappings/graph", response_model=MappingGraphResponse)
async def get_mapping_graph(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    # Get components and mappings
    comp_result = await db.execute(
        select(SourceComponent).where(
            SourceComponent.project_id == project.id,
            SourceComponent.tenant_id == tenant.id,
        )
    )
    components = comp_result.scalars().all()

    map_result = await db.execute(
        select(Mapping).where(
            Mapping.project_id == project.id,
            Mapping.tenant_id == tenant.id,
        )
    )
    mappings = map_result.scalars().all()

    nodes = []
    edges = []

    # Source nodes (left side)
    for i, comp in enumerate(components):
        nodes.append(MappingGraphNode(
            id=f"src-{comp.id}",
            type="source",
            data={
                "label": comp.name,
                "component_type": comp.component_type,
                "complexity": comp.complexity,
            },
            position={"x": 0, "y": i * 120},
        ))

    # Target nodes (right side), grouped by layer
    layer_order = ["BS", "BP", "BO", "DTL", "MSG"]
    layer_y = {}
    y_offset = 0
    for layer in layer_order:
        layer_mappings = [m for m in mappings if m.iris_layer == layer]
        for j, m in enumerate(layer_mappings):
            nodes.append(MappingGraphNode(
                id=f"tgt-{m.id}",
                type="target",
                data={
                    "label": m.target_class_name,
                    "target_type": m.target_type,
                    "iris_layer": m.iris_layer,
                    "confirmed": m.confirmed_by is not None,
                },
                position={"x": 500, "y": y_offset},
            ))
            y_offset += 80

            # Edge from source to target
            if m.source_component_id:
                edges.append(MappingGraphEdge(
                    id=f"edge-{m.id}",
                    source=f"src-{m.source_component_id}",
                    target=f"tgt-{m.id}",
                ))

    return MappingGraphResponse(nodes=nodes, edges=edges)

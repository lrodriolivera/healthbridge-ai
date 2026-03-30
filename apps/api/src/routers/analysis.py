"""Analysis router — trigger analysis, check status, list components"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.project import Project
from src.models.source_component import SourceComponent
from src.models.tenant import Tenant
from src.models.user import User
from src.routers.deps import get_project_for_tenant
from src.schemas.source_component import (
    SourceComponentDetail,
    SourceComponentListResponse,
    SourceComponentResponse,
)
from src.schemas.upload import AnalyzeImageRequest, AnalysisStatusResponse
from src.services.storage import get_storage
from src.workers.analysis_tasks import analyze_image_task, analyze_project_task

router = APIRouter()


@router.post("/{project_id}/analyze")
async def trigger_analysis(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if project.status == "analyzing":
        raise HTTPException(status_code=409, detail="Analysis already in progress")

    task = analyze_project_task.delay(str(project.id), str(tenant.id))

    project.status = "queued_analysis"
    project.metadata_["analysis_task_id"] = task.id
    await db.flush()

    return {"task_id": task.id, "status": "queued"}


@router.get("/{project_id}/analysis/status", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    # Count components by status
    total_result = await db.execute(
        select(func.count()).select_from(SourceComponent).where(
            SourceComponent.project_id == project.id,
            SourceComponent.tenant_id == tenant.id,
        )
    )
    total = total_result.scalar_one()

    analyzed_result = await db.execute(
        select(func.count()).select_from(SourceComponent).where(
            SourceComponent.project_id == project.id,
            SourceComponent.tenant_id == tenant.id,
            SourceComponent.status == "analyzed",
        )
    )
    analyzed = analyzed_result.scalar_one()

    failed_result = await db.execute(
        select(func.count()).select_from(SourceComponent).where(
            SourceComponent.project_id == project.id,
            SourceComponent.tenant_id == tenant.id,
            SourceComponent.status == "analysis_failed",
        )
    )
    failed = failed_result.scalar_one()

    # Count uploaded files
    storage = get_storage()
    files = await storage.list_files(f"{tenant.id}/{project.id}/")
    source_files = [f for f in files if "/images/" not in f["key"]]

    task_id = project.metadata_.get("analysis_task_id") if project.metadata_ else None

    return AnalysisStatusResponse(
        project_id=project.id,
        status=project.status,
        total_files=len(source_files),
        analyzed=analyzed,
        failed=failed,
        task_id=task_id,
    )


@router.get("/{project_id}/components", response_model=SourceComponentListResponse)
async def list_components(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(SourceComponent).where(
            SourceComponent.project_id == project.id,
            SourceComponent.tenant_id == tenant.id,
        )
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(SourceComponent)
        .where(
            SourceComponent.project_id == project.id,
            SourceComponent.tenant_id == tenant.id,
        )
        .order_by(SourceComponent.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    components = result.scalars().all()

    return SourceComponentListResponse(items=components, total=total)


@router.get("/{project_id}/components/{component_id}", response_model=SourceComponentDetail)
async def get_component(
    component_id: uuid.UUID,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SourceComponent).where(
            SourceComponent.id == component_id,
            SourceComponent.project_id == project.id,
            SourceComponent.tenant_id == tenant.id,
        )
    )
    component = result.scalar_one_or_none()
    if component is None:
        raise HTTPException(status_code=404, detail="Component not found")
    return component


@router.post("/{project_id}/analyze-image")
async def analyze_image(
    body: AnalyzeImageRequest,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
):
    task = analyze_image_task.delay(str(project.id), str(tenant.id), body.file_key)
    return {"task_id": task.id, "status": "queued"}

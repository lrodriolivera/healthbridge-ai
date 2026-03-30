"""CodeGen router — trigger generation, view/download generated classes"""

import hashlib
import io
import uuid
import zipfile

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.generated_class import GeneratedClass
from src.models.mapping import Mapping
from src.models.project import Project
from src.models.tenant import Tenant
from src.models.user import User
from src.routers.deps import get_project_for_tenant
from src.schemas.generated_class import (
    GeneratedClassDetail,
    GeneratedClassListResponse,
    GeneratedClassResponse,
    RegenerateRequest,
)
from src.services.storage import get_storage
from src.workers.codegen_tasks import generate_mapping_task, generate_project_task

router = APIRouter()


@router.post("/{project_id}/generate")
async def generate_all(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check there are confirmed mappings
    count = await db.execute(
        select(func.count()).select_from(Mapping).where(
            Mapping.project_id == project.id,
            Mapping.tenant_id == tenant.id,
            Mapping.confirmed_by.isnot(None),
        )
    )
    confirmed = count.scalar_one()
    if confirmed == 0:
        raise HTTPException(status_code=400, detail="No confirmed mappings to generate")

    task = generate_project_task.delay(str(project.id), str(tenant.id))

    project.status = "generating"
    project.metadata_["codegen_task_id"] = task.id
    await db.flush()

    return {"task_id": task.id, "status": "queued", "confirmed_mappings": confirmed}


@router.post("/{project_id}/generate/{mapping_id}")
async def generate_single(
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

    task = generate_mapping_task.delay(str(mapping_id), str(project.id), str(tenant.id))
    return {"task_id": task.id, "status": "queued", "mapping_id": str(mapping_id)}


@router.get("/{project_id}/generated", response_model=GeneratedClassListResponse)
async def list_generated(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(GeneratedClass).where(
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
        )
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(GeneratedClass)
        .where(GeneratedClass.project_id == project.id, GeneratedClass.tenant_id == tenant.id)
        .order_by(GeneratedClass.class_name)
        .offset(skip)
        .limit(limit)
    )
    return GeneratedClassListResponse(items=result.scalars().all(), total=total)


@router.get("/{project_id}/generated/{class_id}", response_model=GeneratedClassDetail)
async def get_generated(
    class_id: uuid.UUID,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedClass).where(
            GeneratedClass.id == class_id,
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
        )
    )
    gc = result.scalar_one_or_none()
    if not gc:
        raise HTTPException(status_code=404, detail="Generated class not found")

    # Fetch code from storage
    storage = get_storage()
    try:
        content = await storage.get_file(gc.s3_key)
        code = content.decode("utf-8")
    except FileNotFoundError:
        code = None

    return GeneratedClassDetail(
        **{c.key: getattr(gc, c.key) for c in gc.__table__.columns},
        code=code,
    )


@router.get("/{project_id}/generated/{class_id}/download")
async def download_generated(
    class_id: uuid.UUID,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedClass).where(
            GeneratedClass.id == class_id,
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
        )
    )
    gc = result.scalar_one_or_none()
    if not gc:
        raise HTTPException(status_code=404, detail="Generated class not found")

    storage = get_storage()
    content = await storage.get_file(gc.s3_key)
    filename = gc.class_name.replace(".", "_") + ".cls"

    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{project_id}/generated/{class_id}/regenerate")
async def regenerate(
    class_id: uuid.UUID,
    body: RegenerateRequest,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedClass).where(
            GeneratedClass.id == class_id,
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
        )
    )
    gc = result.scalar_one_or_none()
    if not gc:
        raise HTTPException(status_code=404, detail="Generated class not found")

    task = generate_mapping_task.delay(
        str(gc.mapping_id), str(project.id), str(tenant.id),
        feedback=body.feedback,
    )
    return {"task_id": task.id, "status": "queued"}


@router.post("/{project_id}/generated/download-all")
async def download_all(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedClass).where(
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
            GeneratedClass.validation_status == "passed",
        )
    )
    classes = result.scalars().all()
    if not classes:
        raise HTTPException(status_code=400, detail="No validated classes to download")

    storage = get_storage()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for gc in classes:
            try:
                content = await storage.get_file(gc.s3_key)
                filename = gc.class_name.replace(".", "/") + ".cls"
                zf.writestr(filename, content)
            except FileNotFoundError:
                continue

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{project.name}_classes.zip"'},
    )

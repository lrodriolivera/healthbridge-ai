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
    # Enforce plan limits
    from src.middleware.plan_enforcer import enforce_limit, enforce_feature
    enforce_feature(tenant, "codegen")
    total_generated = (await db.execute(
        select(func.count()).select_from(GeneratedClass).where(GeneratedClass.tenant_id == tenant.id)
    )).scalar_one()
    enforce_limit(tenant, "max_code_generations", total_generated)

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


@router.get("/{project_id}/generate/progress")
async def generation_progress(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get code generation progress."""
    confirmed_count = (await db.execute(
        select(func.count()).select_from(Mapping).where(
            Mapping.project_id == project.id,
            Mapping.tenant_id == tenant.id,
            Mapping.confirmed_by.isnot(None),
        )
    )).scalar_one()

    generated_count = (await db.execute(
        select(func.count()).select_from(GeneratedClass).where(
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
        )
    )).scalar_one()

    passed_count = (await db.execute(
        select(func.count()).select_from(GeneratedClass).where(
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
            GeneratedClass.validation_status == "passed",
        )
    )).scalar_one()

    failed_count = (await db.execute(
        select(func.count()).select_from(GeneratedClass).where(
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
            GeneratedClass.validation_status == "failed",
        )
    )).scalar_one()

    is_running = project.status in ("generating",)
    task_id = (project.metadata_ or {}).get("codegen_task_id")

    return {
        "status": project.status,
        "is_running": is_running,
        "confirmed_mappings": confirmed_count,
        "generated": generated_count,
        "passed": passed_count,
        "failed": failed_count,
        "task_id": task_id,
        "progress_pct": round((generated_count / confirmed_count * 100) if confirmed_count > 0 else 0, 1),
    }


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

    # Save current version before regenerating
    storage = get_storage()
    try:
        current_code = await storage.get_file(gc.s3_key)
        history_key = f"{gc.s3_key}.v{gc.version}"
        await storage.put_file(history_key, current_code, "text/plain")
    except Exception:
        pass  # Best effort — don't block regeneration

    task = generate_mapping_task.delay(
        str(gc.mapping_id), str(project.id), str(tenant.id),
        feedback=body.feedback,
    )
    return {"task_id": task.id, "status": "queued"}


@router.get("/{project_id}/generated/{class_id}/versions")
async def list_versions(
    class_id: uuid.UUID,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """List all versions of a generated class."""
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
    versions = []
    for v in range(1, gc.version + 1):
        key = f"{gc.s3_key}.v{v}" if v < gc.version else gc.s3_key
        try:
            code = await storage.get_file(key)
            versions.append({"version": v, "size": len(code), "current": v == gc.version})
        except Exception:
            pass

    return {"class_name": gc.class_name, "current_version": gc.version, "versions": versions}


@router.get("/{project_id}/generated/{class_id}/diff")
async def diff_versions(
    class_id: uuid.UUID,
    v1: int = Query(1),
    v2: int = Query(0, description="0 = current version"),
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get diff between two versions of a generated class."""
    import difflib

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
    v2_actual = v2 if v2 > 0 else gc.version

    try:
        key1 = f"{gc.s3_key}.v{v1}" if v1 < gc.version else gc.s3_key
        key2 = f"{gc.s3_key}.v{v2_actual}" if v2_actual < gc.version else gc.s3_key
        code1 = (await storage.get_file(key1)).decode("utf-8").splitlines()
        code2 = (await storage.get_file(key2)).decode("utf-8").splitlines()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Version not found")

    diff = list(difflib.unified_diff(code1, code2, fromfile=f"v{v1}", tofile=f"v{v2_actual}", lineterm=""))

    return {
        "class_name": gc.class_name,
        "from_version": v1,
        "to_version": v2_actual,
        "diff": "\n".join(diff),
        "additions": sum(1 for l in diff if l.startswith("+")),
        "deletions": sum(1 for l in diff if l.startswith("-")),
    }


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

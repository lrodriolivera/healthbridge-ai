"""Upload router — file upload endpoints for projects"""

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.project import Project
from src.models.tenant import Tenant
from src.models.user import User
from src.routers.deps import get_project_for_tenant
from src.schemas.upload import (
    PresignedUrlRequest,
    PresignedUrlResponse,
    UploadConfirmRequest,
    UploadConfirmResponse,
    UploadListResponse,
    UploadListItem,
)
from src.services.storage import get_storage
from src.services.storage.base import StorageService

router = APIRouter()


def _make_key(tenant_id: uuid.UUID, project_id: uuid.UUID, filename: str) -> str:
    unique = uuid.uuid4().hex[:8]
    return f"{tenant_id}/{project_id}/{unique}_{filename}"


@router.post(
    "/{project_id}/uploads/presigned-url",
    response_model=PresignedUrlResponse,
)
async def get_presigned_url(
    body: PresignedUrlRequest,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
):
    storage = get_storage()
    key = _make_key(tenant.id, project.id, body.filename)
    result = await storage.generate_upload_url(key, body.content_type)
    return PresignedUrlResponse(
        upload_url=result["url"],
        file_key=result["key"],
        method=result["method"],
    )


@router.post(
    "/{project_id}/uploads/direct",
    response_model=UploadConfirmResponse,
)
async def upload_direct(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.max_upload_size_mb}MB",
        )

    storage = get_storage()
    key = _make_key(tenant.id, project.id, file.filename)
    await storage.put_file(key, content, file.content_type or "application/octet-stream")

    return UploadConfirmResponse(file_key=key, status="uploaded")


@router.post(
    "/{project_id}/uploads/confirm",
    response_model=UploadConfirmResponse,
)
async def confirm_upload(
    body: UploadConfirmRequest,
    project: Project = Depends(get_project_for_tenant),
):
    storage = get_storage()
    try:
        await storage.get_file(body.file_key)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found in storage")

    return UploadConfirmResponse(file_key=body.file_key, status="confirmed")


@router.post(
    "/{project_id}/uploads/images",
    response_model=UploadConfirmResponse,
)
async def upload_image(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are accepted")

    content = await file.read()
    storage = get_storage()
    key = f"{tenant.id}/{project.id}/images/{uuid.uuid4().hex[:8]}_{file.filename}"
    await storage.put_file(key, content, file.content_type)

    return UploadConfirmResponse(file_key=key, status="uploaded")


@router.get(
    "/{project_id}/uploads",
    response_model=UploadListResponse,
)
async def list_uploads(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
):
    storage = get_storage()
    files = await storage.list_files(f"{tenant.id}/{project.id}/")
    items = [
        UploadListItem(
            file_key=f["key"],
            filename=f["filename"],
            size=f.get("size"),
            last_modified=f.get("last_modified"),
        )
        for f in files
    ]
    return UploadListResponse(items=items)

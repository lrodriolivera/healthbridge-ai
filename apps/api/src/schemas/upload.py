"""Upload and analysis schemas"""

import uuid
from datetime import datetime

from pydantic import BaseModel


class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str


class PresignedUrlResponse(BaseModel):
    upload_url: str
    file_key: str
    method: str


class UploadConfirmRequest(BaseModel):
    file_key: str
    filename: str
    file_type: str  # jar, mirth_xml, image, other


class UploadConfirmResponse(BaseModel):
    file_key: str
    status: str


class UploadListItem(BaseModel):
    file_key: str
    filename: str
    size: int | None = None
    last_modified: str | None = None


class UploadListResponse(BaseModel):
    items: list[UploadListItem]


class AnalysisStatusResponse(BaseModel):
    project_id: uuid.UUID
    status: str
    total_files: int
    analyzed: int
    failed: int
    task_id: str | None = None


class AnalyzeImageRequest(BaseModel):
    file_key: str
    media_type: str = "image/png"

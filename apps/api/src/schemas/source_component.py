"""SourceComponent response schemas"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SourceComponentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    component_type: str
    source_file_s3_key: str | None
    complexity: str | None
    status: str
    exposed_services: list
    external_references: list
    hl7_messages: list
    created_at: datetime


class SourceComponentDetail(SourceComponentResponse):
    analysis_result: dict | None


class SourceComponentListResponse(BaseModel):
    items: list[SourceComponentResponse]
    total: int

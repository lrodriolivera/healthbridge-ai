"""GeneratedClass response schemas"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GeneratedClassResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mapping_id: uuid.UUID
    project_id: uuid.UUID
    class_name: str
    s3_key: str
    version: int
    content_hash: str | None
    generation_model: str | None
    generation_prompt_tokens: int | None
    generation_completion_tokens: int | None
    validation_status: str | None
    validation_issues: list
    deploy_status: dict
    created_at: datetime


class GeneratedClassDetail(GeneratedClassResponse):
    code: str | None = None


class GeneratedClassListResponse(BaseModel):
    items: list[GeneratedClassResponse]
    total: int


class RegenerateRequest(BaseModel):
    feedback: str | None = None

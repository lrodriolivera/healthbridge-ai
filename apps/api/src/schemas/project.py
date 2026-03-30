"""Project request/response schemas"""

import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class SourcePlatform(str, Enum):
    oracle_soa = "oracle_soa"
    mirth_connect = "mirth_connect"
    rhapsody = "rhapsody"
    cloverleaf = "cloverleaf"
    biztalk = "biztalk"
    other = "other"


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    source_platform: SourcePlatform


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: str | None
    source_platform: str
    target_platform: str
    status: str
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int

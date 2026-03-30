"""IRIS Connection schemas"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class IRISConnectionCreate(BaseModel):
    name: str
    base_url: str
    namespace: str
    username: str
    password: str
    ssl_verify: bool = True
    environment: str = "dev"


class IRISConnectionUpdate(BaseModel):
    name: str | None = None
    base_url: str | None = None
    namespace: str | None = None
    username: str | None = None
    password: str | None = None
    ssl_verify: bool | None = None
    environment: str | None = None
    is_active: bool | None = None


class IRISConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    base_url: str
    namespace: str
    ssl_verify: bool
    environment: str
    last_health_check: datetime | None
    is_active: bool
    created_at: datetime


class IRISConnectionListResponse(BaseModel):
    items: list[IRISConnectionResponse]
    total: int


class IRISTestResult(BaseModel):
    connected: bool
    status_code: int | None = None
    error: str | None = None
    response_time_ms: int | None = None

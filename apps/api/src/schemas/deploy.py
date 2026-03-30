"""Deploy request/response schemas"""

import uuid
from datetime import datetime

from pydantic import BaseModel


class DeployRequest(BaseModel):
    iris_connection_id: uuid.UUID
    generate_production: bool = True


class DryRunRequest(BaseModel):
    iris_connection_id: uuid.UUID


class DeployClassItem(BaseModel):
    class_name: str
    iris_layer: str | None
    validation_status: str | None
    order: int


class DryRunResponse(BaseModel):
    classes: list[DeployClassItem]
    total: int
    iris_connection_name: str
    namespace: str


class DeployStatusResponse(BaseModel):
    project_id: uuid.UUID
    status: str
    task_id: str | None = None
    total_classes: int = 0
    deployed: int = 0
    failed: int = 0
    results: list[dict] = []


class DeployHistoryItem(BaseModel):
    deployed_at: str
    iris_connection_name: str
    namespace: str
    total_classes: int
    successful: int
    failed: int
    status: str


class DeployHistoryResponse(BaseModel):
    items: list[DeployHistoryItem]

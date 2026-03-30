"""Mapping request/response schemas"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MappingCreate(BaseModel):
    source_component_id: uuid.UUID | None = None
    target_class_name: str
    target_type: str  # BusinessService, BusinessProcess, BusinessOperation, DTL, Message
    target_extends: str | None = None
    iris_layer: str | None = None  # BS, BP, BO, DTL, MSG, Utils
    settings: dict = {}
    notes: str | None = None


class MappingUpdate(BaseModel):
    target_class_name: str | None = None
    target_type: str | None = None
    target_extends: str | None = None
    iris_layer: str | None = None
    settings: dict | None = None
    notes: str | None = None


class MappingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    source_component_id: uuid.UUID | None
    target_class_name: str
    target_type: str
    target_extends: str | None
    iris_layer: str | None
    settings: dict
    notes: str | None
    auto_generated: bool
    confirmed_by: uuid.UUID | None
    created_at: datetime


class MappingListResponse(BaseModel):
    items: list[MappingResponse]
    total: int


class MappingGraphNode(BaseModel):
    id: str
    type: str  # source or target
    data: dict
    position: dict


class MappingGraphEdge(BaseModel):
    id: str
    source: str
    target: str


class MappingGraphResponse(BaseModel):
    nodes: list[MappingGraphNode]
    edges: list[MappingGraphEdge]

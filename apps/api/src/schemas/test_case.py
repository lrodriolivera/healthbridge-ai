"""TestCase schemas"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TestCaseCreate(BaseModel):
    name: str
    protocol: str  # mllp, http, soap
    target_host: str | None = None
    target_port: int | None = None
    message_content: str
    expected_response: str | None = None
    hl7_message_type: str | None = None
    tags: list[str] = []


class TestCaseUpdate(BaseModel):
    name: str | None = None
    protocol: str | None = None
    target_host: str | None = None
    target_port: int | None = None
    message_content: str | None = None
    expected_response: str | None = None
    hl7_message_type: str | None = None
    tags: list[str] | None = None


class TestCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    protocol: str
    target_host: str | None
    target_port: int | None
    message_content: str
    expected_response: str | None
    hl7_message_type: str | None
    tags: list
    created_at: datetime


class TestCaseListResponse(BaseModel):
    items: list[TestCaseResponse]
    total: int


class ImportHL7Request(BaseModel):
    messages: list[dict]  # [{name, message_content, hl7_message_type, target_host?, target_port?}]

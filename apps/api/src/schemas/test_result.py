"""TestResult schemas"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ExecuteRequest(BaseModel):
    iris_connection_id: uuid.UUID


class ExecuteAllRequest(BaseModel):
    iris_connection_id: uuid.UUID


class TestResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    test_case_id: uuid.UUID
    iris_connection_id: uuid.UUID | None
    status: str
    response_content: str | None
    response_time_ms: int | None
    ack_code: str | None
    error_message: str | None
    executed_at: datetime
    executed_by: uuid.UUID | None


class TestResultDetail(TestResultResponse):
    test_case_name: str | None = None
    protocol: str | None = None


class TestResultListResponse(BaseModel):
    items: list[TestResultResponse]
    total: int
    passed: int = 0
    failed: int = 0
    errors: int = 0


class TestSummary(BaseModel):
    total: int
    passed: int
    failed: int
    errors: int
    avg_response_time_ms: float | None

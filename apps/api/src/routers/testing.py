"""Testing router — test case management and execution"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.iris_connection import IRISConnection
from src.models.project import Project
from src.models.test_case import TestCase
from src.models.test_result import TestResult
from src.models.tenant import Tenant
from src.models.user import User
from src.routers.deps import get_project_for_tenant
from src.schemas.test_case import (
    ImportHL7Request,
    TestCaseCreate,
    TestCaseListResponse,
    TestCaseResponse,
    TestCaseUpdate,
)
from src.schemas.test_result import (
    ExecuteAllRequest,
    ExecuteRequest,
    TestResultListResponse,
    TestResultResponse,
)
from src.services.testing.executor import TestExecutor
from src.workers.testing_tasks import execute_all_tests_task

router = APIRouter()


@router.get("/{project_id}/tests", response_model=TestCaseListResponse)
async def list_tests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(TestCase).where(
            TestCase.project_id == project.id, TestCase.tenant_id == tenant.id
        )
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(TestCase)
        .where(TestCase.project_id == project.id, TestCase.tenant_id == tenant.id)
        .order_by(TestCase.created_at.desc())
        .offset(skip).limit(limit)
    )
    return TestCaseListResponse(items=result.scalars().all(), total=total)


@router.post("/{project_id}/tests", response_model=TestCaseResponse, status_code=201)
async def create_test(
    body: TestCaseCreate,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tc = TestCase(
        project_id=project.id,
        tenant_id=tenant.id,
        name=body.name,
        protocol=body.protocol,
        target_host=body.target_host,
        target_port=body.target_port,
        message_content=body.message_content,
        expected_response=body.expected_response,
        hl7_message_type=body.hl7_message_type,
        tags=body.tags,
        created_by=current_user.id,
    )
    db.add(tc)
    await db.flush()
    await db.refresh(tc)
    return tc


@router.put("/{project_id}/tests/{test_id}", response_model=TestCaseResponse)
async def update_test(
    test_id: uuid.UUID,
    body: TestCaseUpdate,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TestCase).where(
            TestCase.id == test_id, TestCase.project_id == project.id, TestCase.tenant_id == tenant.id
        )
    )
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tc, field, value)
    await db.flush()
    await db.refresh(tc)
    return tc


@router.post("/{project_id}/tests/{test_id}/execute", response_model=TestResultResponse)
async def execute_test(
    test_id: uuid.UUID,
    body: ExecuteRequest,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tc_result = await db.execute(
        select(TestCase).where(
            TestCase.id == test_id, TestCase.project_id == project.id, TestCase.tenant_id == tenant.id
        )
    )
    tc = tc_result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    conn_result = await db.execute(
        select(IRISConnection).where(
            IRISConnection.id == body.iris_connection_id, IRISConnection.tenant_id == tenant.id
        )
    )
    conn = conn_result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="IRIS connection not found")

    executor = TestExecutor()
    result_data = await executor.execute(tc, conn)

    tr = TestResult(
        test_case_id=tc.id,
        iris_connection_id=conn.id,
        tenant_id=tenant.id,
        status=result_data["status"],
        response_content=result_data.get("response_content"),
        response_time_ms=result_data.get("response_time_ms"),
        ack_code=result_data.get("ack_code"),
        error_message=result_data.get("error_message"),
        executed_by=current_user.id,
    )
    db.add(tr)
    await db.flush()
    await db.refresh(tr)
    return tr


@router.post("/{project_id}/tests/execute-all")
async def execute_all(
    body: ExecuteAllRequest,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
):
    task = execute_all_tests_task.delay(
        str(project.id), str(tenant.id), str(body.iris_connection_id), str(current_user.id)
    )
    return {"task_id": task.id, "status": "queued"}


@router.get("/{project_id}/tests/results", response_model=TestResultListResponse)
async def list_results(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    # Get test case IDs for this project
    tc_ids_result = await db.execute(
        select(TestCase.id).where(
            TestCase.project_id == project.id, TestCase.tenant_id == tenant.id
        )
    )
    tc_ids = [r[0] for r in tc_ids_result.all()]

    if not tc_ids:
        return TestResultListResponse(items=[], total=0, passed=0, failed=0, errors=0)

    count_result = await db.execute(
        select(func.count()).select_from(TestResult).where(
            TestResult.test_case_id.in_(tc_ids), TestResult.tenant_id == tenant.id
        )
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(TestResult)
        .where(TestResult.test_case_id.in_(tc_ids), TestResult.tenant_id == tenant.id)
        .order_by(TestResult.executed_at.desc())
        .offset(skip).limit(limit)
    )
    results = result.scalars().all()

    passed = sum(1 for r in results if r.status == "pass")
    failed = sum(1 for r in results if r.status == "fail")
    errors = sum(1 for r in results if r.status == "error")

    return TestResultListResponse(items=results, total=total, passed=passed, failed=failed, errors=errors)


@router.get("/{project_id}/tests/results/{result_id}", response_model=TestResultResponse)
async def get_result(
    result_id: uuid.UUID,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TestResult).where(
            TestResult.id == result_id, TestResult.tenant_id == tenant.id
        )
    )
    tr = result.scalar_one_or_none()
    if not tr:
        raise HTTPException(status_code=404, detail="Test result not found")
    return tr


@router.post("/{project_id}/tests/import-hl7", response_model=TestCaseListResponse)
async def import_hl7(
    body: ImportHL7Request,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    created = []
    for msg in body.messages:
        tc = TestCase(
            project_id=project.id,
            tenant_id=tenant.id,
            name=msg.get("name", "Imported HL7"),
            protocol="mllp",
            target_host=msg.get("target_host"),
            target_port=msg.get("target_port"),
            message_content=msg["message_content"],
            hl7_message_type=msg.get("hl7_message_type"),
            expected_response=msg.get("expected_response", "AA"),
            tags=["imported"],
            created_by=current_user.id,
        )
        db.add(tc)
        created.append(tc)

    await db.flush()
    for tc in created:
        await db.refresh(tc)

    return TestCaseListResponse(items=created, total=len(created))

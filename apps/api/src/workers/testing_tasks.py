"""Testing Celery tasks — batch test execution"""

import asyncio
import uuid

import structlog

from src.db import SyncSession
from src.models.iris_connection import IRISConnection
from src.models.test_case import TestCase
from src.models.test_result import TestResult
from src.services.testing.executor import TestExecutor
from src.workers import celery_app

logger = structlog.get_logger()


async def _execute_all_async(
    project_id: str,
    tenant_id: str,
    connection_id: str,
    user_id: str,
):
    executor = TestExecutor()

    with SyncSession() as session:
        conn = session.get(IRISConnection, uuid.UUID(connection_id))
        if not conn:
            logger.error("IRIS connection not found", connection_id=connection_id)
            return

        test_cases = session.query(TestCase).filter(
            TestCase.project_id == uuid.UUID(project_id),
            TestCase.tenant_id == uuid.UUID(tenant_id),
        ).all()

        if not test_cases:
            logger.info("No test cases found", project_id=project_id)
            return

        for tc in test_cases:
            try:
                result_data = await executor.execute(tc, conn)

                tr = TestResult(
                    test_case_id=tc.id,
                    iris_connection_id=conn.id,
                    tenant_id=uuid.UUID(tenant_id),
                    status=result_data["status"],
                    response_content=result_data.get("response_content"),
                    response_time_ms=result_data.get("response_time_ms"),
                    ack_code=result_data.get("ack_code"),
                    error_message=result_data.get("error_message"),
                    executed_by=uuid.UUID(user_id),
                )
                session.add(tr)
                session.commit()

                logger.info(
                    "Test executed",
                    test_case=tc.name,
                    status=result_data["status"],
                    ack_code=result_data.get("ack_code"),
                )
            except Exception as e:
                logger.error("Test execution failed", test_case=tc.name, error=str(e))
                tr = TestResult(
                    test_case_id=tc.id,
                    iris_connection_id=conn.id,
                    tenant_id=uuid.UUID(tenant_id),
                    status="error",
                    error_message=str(e),
                    executed_by=uuid.UUID(user_id),
                )
                session.add(tr)
                session.commit()


@celery_app.task(name="execute_all_tests", bind=True, max_retries=0)
def execute_all_tests_task(self, project_id: str, tenant_id: str, connection_id: str, user_id: str):
    try:
        asyncio.run(_execute_all_async(project_id, tenant_id, connection_id, user_id))
    except Exception as exc:
        logger.error("execute_all_tests_task failed", error=str(exc))

"""Test executor — orchestrates test execution against IRIS"""

import structlog

from src.models.iris_connection import IRISConnection
from src.models.test_case import TestCase
from src.services.testing.http_client import HTTPTestClient
from src.services.testing.mllp_client import MLLPClient

logger = structlog.get_logger()


class TestExecutor:
    async def execute(self, test_case: TestCase, connection: IRISConnection) -> dict:
        """Execute a test case against an IRIS connection. Returns result dict."""
        host = test_case.target_host or connection.base_url.split("://")[-1].split(":")[0].split("/")[0]
        port = test_case.target_port

        if test_case.protocol == "mllp":
            return await self._execute_mllp(host, port or 2575, test_case)
        elif test_case.protocol == "http":
            return await self._execute_http(host, port or 80, test_case, connection)
        elif test_case.protocol == "soap":
            return await self._execute_soap(host, port or 80, test_case, connection)
        else:
            return {"status": "error", "error_message": f"Unknown protocol: {test_case.protocol}"}

    async def _execute_mllp(self, host: str, port: int, test_case: TestCase) -> dict:
        client = MLLPClient(host=host, port=port)
        result = await client.send_message(test_case.message_content)

        status = "error"
        if result.get("success"):
            ack_code = result.get("ack_code")
            if test_case.expected_response:
                status = "pass" if ack_code == test_case.expected_response.strip() else "fail"
            else:
                status = "pass" if ack_code == "AA" else "fail"
        elif result.get("error"):
            status = "error"

        return {
            "status": status,
            "response_content": result.get("response"),
            "response_time_ms": result.get("response_time_ms"),
            "ack_code": result.get("ack_code"),
            "error_message": result.get("error"),
        }

    async def _execute_http(self, host: str, port: int, test_case: TestCase, connection: IRISConnection) -> dict:
        client = HTTPTestClient()
        url = f"http://{host}:{port}"
        if test_case.target_host and "://" in test_case.target_host:
            url = test_case.target_host

        result = await client.send_http(url=url, body=test_case.message_content)

        status = "error"
        if result.get("success"):
            if test_case.expected_response:
                status = "pass" if test_case.expected_response.strip() in (result.get("response") or "") else "fail"
            else:
                status = "pass"
        elif result.get("error"):
            status = "error"
        else:
            status = "fail"

        return {
            "status": status,
            "response_content": result.get("response"),
            "response_time_ms": result.get("response_time_ms"),
            "ack_code": str(result.get("status_code", "")),
            "error_message": result.get("error"),
        }

    async def _execute_soap(self, host: str, port: int, test_case: TestCase, connection: IRISConnection) -> dict:
        client = HTTPTestClient()
        url = f"http://{host}:{port}"
        if test_case.target_host and "://" in test_case.target_host:
            url = test_case.target_host

        creds = connection.credentials or {}
        result = await client.send_soap(
            url=url,
            soap_action=test_case.hl7_message_type or "",
            body=test_case.message_content,
            username=creds.get("username"),
            password=creds.get("password"),
        )

        status = "error"
        if result.get("success"):
            if test_case.expected_response:
                status = "pass" if test_case.expected_response.strip() in (result.get("response") or "") else "fail"
            else:
                status = "pass"
        elif result.get("error"):
            status = "error"
        else:
            status = "fail"

        return {
            "status": status,
            "response_content": result.get("response"),
            "response_time_ms": result.get("response_time_ms"),
            "ack_code": str(result.get("status_code", "")),
            "error_message": result.get("error"),
        }

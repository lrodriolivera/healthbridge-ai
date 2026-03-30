"""HTTP/SOAP test client for integration testing"""

import time

import httpx
import structlog

logger = structlog.get_logger()


class HTTPTestClient:
    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout

    async def send_http(
        self,
        url: str,
        method: str = "POST",
        body: str | None = None,
        headers: dict | None = None,
    ) -> dict:
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    content=body,
                    headers=headers or {},
                )
                elapsed = int((time.time() - start) * 1000)

                return {
                    "success": 200 <= response.status_code < 400,
                    "status_code": response.status_code,
                    "response": response.text,
                    "response_time_ms": elapsed,
                }
        except httpx.ConnectError as e:
            return {"success": False, "status_code": None, "response": None, "response_time_ms": None, "error": f"Connection error: {e}"}
        except httpx.TimeoutException:
            return {"success": False, "status_code": None, "response": None, "response_time_ms": None, "error": "Request timed out"}
        except Exception as e:
            return {"success": False, "status_code": None, "response": None, "response_time_ms": None, "error": str(e)}

    async def send_soap(
        self,
        url: str,
        soap_action: str,
        body: str,
        username: str | None = None,
        password: str | None = None,
    ) -> dict:
        headers = {
            "Content-Type": "text/xml; charset=UTF-8",
            "SOAPAction": soap_action,
        }
        if username and password:
            import base64
            auth_b64 = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers["Authorization"] = f"Basic {auth_b64}"

        return await self.send_http(url, method="POST", body=body, headers=headers)

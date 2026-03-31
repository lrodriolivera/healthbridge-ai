"""HTTP/SOAP test client for integration testing"""

import ipaddress
import time
from urllib.parse import urlparse

import httpx
import structlog

logger = structlog.get_logger()

# Blocked internal networks (SSRF protection)
BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.169.254/32"),  # AWS metadata
    ipaddress.ip_network("10.0.0.0/8"),           # Private
    ipaddress.ip_network("172.16.0.0/12"),         # Private
    ipaddress.ip_network("192.168.0.0/16"),        # Private
]


def validate_url(url: str):
    """Validate URL is not targeting internal/metadata endpoints."""
    parsed = urlparse(url)
    hostname = parsed.hostname or ""

    if not hostname:
        raise ValueError("URL must have a hostname")

    # Block localhost variants
    if hostname in ("localhost", "0.0.0.0", "[::]"):
        raise ValueError("Internal URLs not allowed")

    # Block internal IPs
    try:
        ip = ipaddress.ip_address(hostname)
        for network in BLOCKED_NETWORKS:
            if ip in network:
                raise ValueError(f"Internal IP {hostname} not allowed")
    except ValueError as e:
        if "not allowed" in str(e):
            raise
        # hostname is a DNS name, not IP — allow (will resolve at request time)


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
            validate_url(url)
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

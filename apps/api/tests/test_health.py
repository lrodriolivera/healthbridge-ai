"""Tests for health check and basic app config"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "healthbridge-ai"


@pytest.mark.asyncio
async def test_openapi_docs(client: AsyncClient):
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "HealthBridge AI"
    assert "/api/v1/auth/login" in str(schema["paths"])
    assert "/api/v1/projects" in str(schema["paths"])

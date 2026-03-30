"""Tests for auth API endpoints"""

import pytest
import pytest_asyncio
from httpx import AsyncClient


@pytest.mark.asyncio
class TestRegister:
    async def test_register_success(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/register", json={
            "email": "newuser@test.com",
            "password": "securepass123",
            "tenant_name": "New Organization",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_register_duplicate_email(self, client: AsyncClient):
        # First registration
        await client.post("/api/v1/auth/register", json={
            "email": "duplicate@test.com",
            "password": "pass123",
            "tenant_name": "Org A",
        })
        # Second with same email
        response = await client.post("/api/v1/auth/register", json={
            "email": "duplicate@test.com",
            "password": "pass456",
            "tenant_name": "Org B",
        })
        assert response.status_code == 409

    async def test_register_invalid_email(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "password": "pass123",
            "tenant_name": "Org",
        })
        assert response.status_code == 422


@pytest.mark.asyncio
class TestLogin:
    async def test_login_success(self, client: AsyncClient):
        # Register first
        await client.post("/api/v1/auth/register", json={
            "email": "login@test.com",
            "password": "mypassword",
            "tenant_name": "Login Org",
        })
        # Login
        response = await client.post("/api/v1/auth/login", json={
            "email": "login@test.com",
            "password": "mypassword",
        })
        assert response.status_code == 200
        assert "access_token" in response.json()

    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post("/api/v1/auth/register", json={
            "email": "wrongpass@test.com",
            "password": "correct",
            "tenant_name": "WP Org",
        })
        response = await client.post("/api/v1/auth/login", json={
            "email": "wrongpass@test.com",
            "password": "incorrect",
        })
        assert response.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com",
            "password": "pass",
        })
        assert response.status_code == 401


@pytest.mark.asyncio
class TestMe:
    async def test_me_authenticated(self, client: AsyncClient, auth_headers: dict):
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "tenant_id" in data

    async def test_me_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_me_invalid_token(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 401

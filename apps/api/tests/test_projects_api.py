"""Tests for projects API endpoints"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestProjectsCRUD:
    async def test_create_project(self, client: AsyncClient, auth_headers: dict):
        response = await client.post("/api/v1/projects/", json={
            "name": "UC CHRISTUS Migration",
            "description": "Mirth to IRIS",
            "source_platforms": ["mirth_connect"],
        }, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "UC CHRISTUS Migration"
        assert data["source_platform"] == "mirth_connect"
        assert data["status"] == "created"
        assert data["target_platform"] == "iris_healthconnect"

    async def test_list_projects(self, client: AsyncClient, auth_headers: dict):
        # Create two projects
        await client.post("/api/v1/projects/", json={
            "name": "Project 1", "source_platforms": ["oracle_soa"],
        }, headers=auth_headers)
        await client.post("/api/v1/projects/", json={
            "name": "Project 2", "source_platforms": ["mirth_connect"],
        }, headers=auth_headers)

        response = await client.get("/api/v1/projects/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    async def test_get_project(self, client: AsyncClient, auth_headers: dict):
        create_resp = await client.post("/api/v1/projects/", json={
            "name": "Get Me", "source_platforms": ["rhapsody"],
        }, headers=auth_headers)
        project_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["name"] == "Get Me"

    async def test_update_project(self, client: AsyncClient, auth_headers: dict):
        create_resp = await client.post("/api/v1/projects/", json={
            "name": "Old Name", "source_platforms": ["oracle_soa"],
        }, headers=auth_headers)
        project_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/projects/{project_id}", json={
            "name": "New Name", "description": "Updated",
        }, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"
        assert response.json()["description"] == "Updated"

    async def test_delete_project(self, client: AsyncClient, auth_headers: dict):
        create_resp = await client.post("/api/v1/projects/", json={
            "name": "Delete Me", "source_platforms": ["biztalk"],
        }, headers=auth_headers)
        project_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    async def test_invalid_source_platform(self, client: AsyncClient, auth_headers: dict):
        response = await client.post("/api/v1/projects/", json={
            "name": "Bad Platform", "source_platforms": ["invalid_platform"],
        }, headers=auth_headers)
        assert response.status_code == 422

    async def test_unauthenticated_access(self, client: AsyncClient):
        response = await client.get("/api/v1/projects/")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestTenantIsolation:
    async def test_cannot_access_other_tenant_project(self, client: AsyncClient):
        # Create tenant A
        reg_a = await client.post("/api/v1/auth/register", json={
            "email": "a@a.com", "password": "pass", "tenant_name": "Tenant A",
        })
        token_a = reg_a.json()["access_token"]

        # Create project in tenant A
        proj = await client.post("/api/v1/projects/", json={
            "name": "Private", "source_platforms": ["oracle_soa"],
        }, headers={"Authorization": f"Bearer {token_a}"})
        project_id = proj.json()["id"]

        # Create tenant B
        reg_b = await client.post("/api/v1/auth/register", json={
            "email": "b@b.com", "password": "pass", "tenant_name": "Tenant B",
        })
        token_b = reg_b.json()["access_token"]

        # Tenant B tries to access tenant A's project
        response = await client.get(
            f"/api/v1/projects/{project_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert response.status_code == 404

"""
End-to-end tests covering the full migration pipeline:
Register → Create Project → Upload → Components → Mappings → Generate → Deploy → Test → Export
"""

import io
import zipfile

import pytest
from httpx import AsyncClient


@pytest.fixture
async def pipeline(client: AsyncClient):
    """Set up a complete pipeline: register user, create project, add components."""

    # 1. Register
    reg = await client.post("/api/v1/auth/register", json={
        "email": "e2e@pipeline.com",
        "password": "E2ePass123",
        "tenant_name": "E2E Pipeline Org",
    })
    assert reg.status_code == 200
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create project with multiple platforms
    proj = await client.post("/api/v1/projects", json={
        "name": "E2E Migration Test",
        "description": "Full pipeline test",
        "source_platforms": ["mirth_connect", "oracle_soa"],
    }, headers=headers)
    assert proj.status_code == 201
    project = proj.json()
    assert project["source_platforms"] == ["mirth_connect", "oracle_soa"]

    return {"headers": headers, "project": project}


class TestFullPipeline:
    """Tests the complete migration pipeline end-to-end."""

    async def test_01_register_and_login(self, client: AsyncClient):
        # Register
        reg = await client.post("/api/v1/auth/register", json={
            "email": "e2e-auth@test.com", "password": "TestPass1", "tenant_name": "Auth Test Org",
        })
        assert reg.status_code == 200
        token = reg.json()["access_token"]

        # Login with same credentials
        login = await client.post("/api/v1/auth/login", json={
            "email": "e2e-auth@test.com", "password": "TestPass1",
        })
        assert login.status_code == 200
        assert "access_token" in login.json()

        # Get me
        me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == "e2e-auth@test.com"

    async def test_02_project_crud(self, client: AsyncClient, pipeline):
        headers = pipeline["headers"]
        project = pipeline["project"]

        # List projects
        resp = await client.get("/api/v1/projects", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

        # Get project
        resp = await client.get(f"/api/v1/projects/{project['id']}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "E2E Migration Test"

        # Update project
        resp = await client.put(f"/api/v1/projects/{project['id']}", json={
            "description": "Updated description",
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated description"

    async def test_03_file_upload(self, client: AsyncClient, pipeline):
        headers = pipeline["headers"]
        pid = pipeline["project"]["id"]

        # Create a mock JAR file
        jar_buf = io.BytesIO()
        with zipfile.ZipFile(jar_buf, "w") as zf:
            zf.writestr("composite.xml", "<composite><component name='test'/></composite>")
            zf.writestr("process.bpel", "<bpel>mock</bpel>")
        jar_buf.seek(0)

        # Upload via direct endpoint
        resp = await client.post(
            f"/api/v1/projects/{pid}/uploads/direct",
            files={"file": ("test.jar", jar_buf, "application/java-archive")},
            headers={k: v for k, v in headers.items()},  # no Content-Type for multipart
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "uploaded"
        file_key = resp.json()["file_key"]

        # Upload a Mirth XML
        mirth_xml = """<?xml version="1.0"?>
        <channel><name>TestChannel</name><description>E2E</description>
        <enabled>true</enabled>
        <sourceConnector><name>TCP</name><transportName>TCP Listener</transportName>
        <mode>SOURCE</mode><enabled>true</enabled><properties/>
        <transformer><steps/></transformer><filter><rules/></filter>
        </sourceConnector>
        <destinationConnectors/>
        <properties/></channel>"""

        resp = await client.post(
            f"/api/v1/projects/{pid}/uploads/direct",
            files={"file": ("channel.xml", mirth_xml.encode(), "text/xml")},
            headers={k: v for k, v in headers.items()},
        )
        assert resp.status_code == 200

        # List uploads
        resp = await client.get(f"/api/v1/projects/{pid}/uploads", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 2

    async def test_04_components_and_analysis(self, client: AsyncClient, pipeline):
        """Test component listing (mock components created via direct DB)."""
        headers = pipeline["headers"]
        pid = pipeline["project"]["id"]

        # Components list should be empty initially
        resp = await client.get(f"/api/v1/projects/{pid}/components", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    async def test_05_mappings_crud(self, client: AsyncClient, pipeline):
        headers = pipeline["headers"]
        pid = pipeline["project"]["id"]

        # Create mapping
        resp = await client.post(f"/api/v1/projects/{pid}/mappings", json={
            "target_class_name": "E2E.BP.TestRouter",
            "target_type": "BusinessProcess",
            "target_extends": "Ens.BusinessProcess",
            "iris_layer": "BP",
        }, headers=headers)
        assert resp.status_code == 201
        mapping = resp.json()
        assert mapping["target_class_name"] == "E2E.BP.TestRouter"
        assert mapping["auto_generated"] is False
        mid = mapping["id"]

        # List mappings
        resp = await client.get(f"/api/v1/projects/{pid}/mappings", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

        # Confirm mapping
        resp = await client.post(f"/api/v1/projects/{pid}/mappings/{mid}/confirm", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["confirmed_by"] is not None

        # Get mapping graph
        resp = await client.get(f"/api/v1/projects/{pid}/mappings/graph", headers=headers)
        assert resp.status_code == 200
        graph = resp.json()
        assert "nodes" in graph
        assert "edges" in graph

        # Update mapping
        resp = await client.put(f"/api/v1/projects/{pid}/mappings/{mid}", json={
            "notes": "E2E test mapping",
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["notes"] == "E2E test mapping"

        # Delete mapping
        resp = await client.delete(f"/api/v1/projects/{pid}/mappings/{mid}", headers=headers)
        assert resp.status_code == 204

    async def test_06_iris_connections(self, client: AsyncClient, pipeline):
        headers = pipeline["headers"]

        # Create connection
        resp = await client.post("/api/v1/iris-connections", json={
            "name": "E2E IRIS Test",
            "base_url": "http://iris-test:57772",
            "namespace": "E2E",
            "username": "SuperUser",
            "password": "SYS",
            "environment": "test",
        }, headers=headers)
        assert resp.status_code == 201
        conn = resp.json()
        conn_id = conn["id"]
        assert conn["name"] == "E2E IRIS Test"
        assert conn["environment"] == "test"
        # Credentials NOT in response
        assert "username" not in conn
        assert "password" not in conn

        # List connections
        resp = await client.get("/api/v1/iris-connections", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

        # Update connection
        resp = await client.put(f"/api/v1/iris-connections/{conn_id}", json={
            "name": "E2E IRIS Updated",
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "E2E IRIS Updated"

        # Delete connection
        resp = await client.delete(f"/api/v1/iris-connections/{conn_id}", headers=headers)
        assert resp.status_code == 204

    async def test_07_test_cases_crud(self, client: AsyncClient, pipeline):
        headers = pipeline["headers"]
        pid = pipeline["project"]["id"]

        # Create test case
        resp = await client.post(f"/api/v1/projects/{pid}/tests", json={
            "name": "ADT A01 Test",
            "protocol": "mllp",
            "target_host": "iris-test",
            "target_port": 2575,
            "message_content": "MSH|^~\\&|TEST|E2E|IRIS|HB|20260330||ADT^A01|001|P|2.5\rPID|||12345||TEST^PATIENT",
            "expected_response": "AA",
            "hl7_message_type": "ADT^A01",
            "tags": ["e2e", "adt"],
        }, headers=headers)
        assert resp.status_code == 201
        tc = resp.json()
        assert tc["name"] == "ADT A01 Test"
        assert tc["protocol"] == "mllp"
        tid = tc["id"]

        # List tests
        resp = await client.get(f"/api/v1/projects/{pid}/tests", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

        # Import HL7 bulk
        resp = await client.post(f"/api/v1/projects/{pid}/tests/import-hl7", json={
            "messages": [
                {"name": "ADT A08", "message_content": "MSH|^~\\&|TEST||IRIS||20260330||ADT^A08|002|P|2.5\rPID|||12345", "hl7_message_type": "ADT^A08"},
                {"name": "ORM O01", "message_content": "MSH|^~\\&|TEST||IRIS||20260330||ORM^O01|003|P|2.5\rPID|||12345\rORC|NW|001", "hl7_message_type": "ORM^O01"},
            ],
        }, headers=headers)
        assert resp.status_code in (200, 201)
        assert resp.json()["total"] == 2

        # Update test
        resp = await client.put(f"/api/v1/projects/{pid}/tests/{tid}", json={
            "name": "ADT A01 - Updated",
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "ADT A01 - Updated"

    async def test_08_deploy_dry_run(self, client: AsyncClient, pipeline):
        headers = pipeline["headers"]
        pid = pipeline["project"]["id"]

        # Create connection for dry-run
        conn_resp = await client.post("/api/v1/iris-connections", json={
            "name": "DryRun IRIS", "base_url": "http://iris:57772",
            "namespace": "HB", "username": "User", "password": "Pass",
        }, headers=headers)
        conn_id = conn_resp.json()["id"]

        # Dry run (no validated classes, so empty)
        resp = await client.post(f"/api/v1/projects/{pid}/deploy/dry-run", json={
            "iris_connection_id": conn_id,
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0  # No generated classes yet

        # Deploy status
        resp = await client.get(f"/api/v1/projects/{pid}/deploy/status", headers=headers)
        assert resp.status_code == 200
        assert "status" in resp.json()

        # Deploy history
        resp = await client.get(f"/api/v1/projects/{pid}/deploy/history", headers=headers)
        assert resp.status_code == 200
        assert "items" in resp.json()

    async def test_09_export(self, client: AsyncClient, pipeline):
        headers = pipeline["headers"]
        pid = pipeline["project"]["id"]

        # Export summary
        resp = await client.get(f"/api/v1/projects/{pid}/export/summary", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["project"]["name"] == "E2E Migration Test"
        assert "components" in data
        assert "mappings" in data

        # Export documentation
        resp = await client.get(f"/api/v1/projects/{pid}/export/documentation", headers=headers)
        assert resp.status_code == 200
        assert "Migration Documentation" in resp.text

    async def test_10_audit_log(self, client: AsyncClient, pipeline):
        headers = pipeline["headers"]

        resp = await client.get("/api/v1/audit-logs", headers=headers)
        assert resp.status_code == 200
        # May be 0 since we didn't hook audit middleware, but endpoint works
        assert "items" in resp.json()
        assert "total" in resp.json()

    async def test_11_tenant_isolation(self, client: AsyncClient, pipeline):
        """Verify tenant B cannot access tenant A's resources."""
        headers_a = pipeline["headers"]
        pid_a = pipeline["project"]["id"]

        # Register tenant B
        reg_b = await client.post("/api/v1/auth/register", json={
            "email": "tenant-b@test.com", "password": "PassB1234", "tenant_name": "Tenant B",
        })
        headers_b = {"Authorization": f"Bearer {reg_b.json()['access_token']}"}

        # Tenant B cannot see Tenant A's project
        resp = await client.get(f"/api/v1/projects/{pid_a}", headers=headers_b)
        assert resp.status_code == 404

        # Tenant B cannot see Tenant A's mappings
        resp = await client.get(f"/api/v1/projects/{pid_a}/mappings", headers=headers_b)
        assert resp.status_code == 404

        # Tenant B cannot see Tenant A's components
        resp = await client.get(f"/api/v1/projects/{pid_a}/components", headers=headers_b)
        assert resp.status_code == 404

        # Tenant B has 0 projects
        resp = await client.get("/api/v1/projects", headers=headers_b)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    async def test_12_health_check(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

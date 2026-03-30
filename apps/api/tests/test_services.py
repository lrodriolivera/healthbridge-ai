"""Tests for services (storage, mapping generator, doc exporter, notifications)"""

import os
import shutil
import tempfile
import uuid

import pytest
import pytest_asyncio

from src.services.storage.local import LocalStorageService
from src.services.doc_exporter import export_project_documentation, export_project_summary
from src.workers.analysis_tasks import _extract_json


class TestLocalStorage:
    @pytest_asyncio.fixture
    async def storage(self):
        tmpdir = tempfile.mkdtemp()
        os.environ["UPLOAD_DIR"] = tmpdir

        class TestStorage(LocalStorageService):
            def __init__(self):
                from pathlib import Path
                self.base_dir = Path(tmpdir)

        s = TestStorage()
        yield s
        shutil.rmtree(tmpdir, ignore_errors=True)

    @pytest.mark.asyncio
    async def test_put_and_get(self, storage):
        key = "tenant1/proj1/test.txt"
        await storage.put_file(key, b"hello world", "text/plain")
        content = await storage.get_file(key)
        assert content == b"hello world"

    @pytest.mark.asyncio
    async def test_list_files(self, storage):
        await storage.put_file("t/p/a.txt", b"a", "text/plain")
        await storage.put_file("t/p/b.txt", b"b", "text/plain")
        files = await storage.list_files("t/p/")
        assert len(files) == 2
        filenames = {f["filename"] for f in files}
        assert filenames == {"a.txt", "b.txt"}

    @pytest.mark.asyncio
    async def test_delete_file(self, storage):
        await storage.put_file("t/p/del.txt", b"x", "text/plain")
        assert await storage.delete_file("t/p/del.txt") is True
        with pytest.raises(FileNotFoundError):
            await storage.get_file("t/p/del.txt")

    @pytest.mark.asyncio
    async def test_get_nonexistent_raises(self, storage):
        with pytest.raises(FileNotFoundError):
            await storage.get_file("does/not/exist.txt")


class TestJSONExtractor:
    def test_direct_json(self):
        result = _extract_json('{"key": "value"}')
        assert result == {"key": "value"}

    def test_json_in_code_block(self):
        text = '```json\n{"a": 1}\n```'
        result = _extract_json(text)
        assert result == {"a": 1}

    def test_json_embedded_in_text(self):
        text = 'Here is the analysis:\n{"component": "test"}\nEnd.'
        result = _extract_json(text)
        assert result == {"component": "test"}

    def test_no_json_returns_none(self):
        assert _extract_json("no json here") is None

    def test_array_json(self):
        result = _extract_json('[1, 2, 3]')
        assert result == [1, 2, 3]


class TestDocExporter:
    def _make_project(self):
        """Create a mock project object."""
        class MockProject:
            id = uuid.uuid4()
            name = "Test Migration"
            source_platform = "mirth_connect"
            target_platform = "iris_healthconnect"
            status = "deployed"
            metadata_ = {"deploy_history": [{"deployed_at": "2026-03-30", "iris_connection_name": "DEV", "namespace": "HB", "total_classes": 5, "successful": 5, "failed": 0}]}
        return MockProject()

    def _make_component(self, name="ADT_Channel"):
        class MockComponent:
            pass
        c = MockComponent()
        c.name = name
        c.component_type = "mirth_channel"
        c.complexity = "medium"
        c.status = "analyzed"
        c.exposed_services = [{"name": "TCP:2575", "type": "MLLP", "port": 2575}]
        c.hl7_messages = [{"type": "ADT^A01", "direction": "inbound"}]
        c.external_references = []
        return c

    def _make_mapping(self):
        class MockMapping:
            pass
        m = MockMapping()
        m.source_component_id = uuid.uuid4()
        m.target_class_name = "HB.BP.ADTRouter"
        m.target_type = "BusinessProcess"
        m.iris_layer = "BP"
        m.confirmed_by = uuid.uuid4()
        return m

    def _make_generated(self):
        class MockGenerated:
            pass
        g = MockGenerated()
        g.class_name = "HB.BP.ADTRouter"
        g.version = 1
        g.validation_status = "passed"
        g.deploy_status = {"status": "deployed"}
        return g

    def test_export_documentation(self):
        doc = export_project_documentation(
            self._make_project(),
            [self._make_component()],
            [self._make_mapping()],
            [self._make_generated()],
            [],
        )
        assert "# Migration Documentation: Test Migration" in doc
        assert "mirth_connect" in doc
        assert "ADT_Channel" in doc
        assert "HB.BP.ADTRouter" in doc
        assert "HealthBridge AI" in doc

    def test_export_summary(self):
        summary = export_project_summary(
            self._make_project(),
            [self._make_component()],
            [self._make_mapping()],
            [self._make_generated()],
            [],
        )
        assert summary["project"]["name"] == "Test Migration"
        assert summary["components"]["total"] == 1
        assert summary["mappings"]["total"] == 1
        assert summary["generated_classes"]["passed"] == 1

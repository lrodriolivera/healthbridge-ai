"""Analysis Celery tasks — parse files and run Claude analysis agents"""

import asyncio
import json
import re
import uuid

import structlog

from src.config import settings
from src.db import SyncSession
from src.models.project import Project
from src.models.source_component import SourceComponent
from src.models.tenant import Tenant
from src.services.agents.analysis_agent import AnalysisAgent
from src.services.file_parser.jar_parser import JARParser
from src.services.file_parser.mirth_parser import MirthParser
from src.services.storage import get_storage
from src.workers import celery_app

logger = structlog.get_logger()


def _extract_json(text: str) -> dict | None:
    """Extract JSON from Claude response, handling markdown code blocks. v3"""
    if not text:
        return None

    logger.info("_extract_json called", text_len=len(text), starts_with=text[:40].replace("\n","\\n"))

    # Step 1: Strip markdown code fences if present
    stripped = text.strip()
    if stripped.startswith("```"):
        # Remove opening fence (```json or ```)
        first_newline = stripped.find("\n")
        if first_newline > 0:
            stripped = stripped[first_newline + 1:]
        # Remove closing fence
        if stripped.rstrip().endswith("```"):
            stripped = stripped.rstrip()[:-3].rstrip()

    # Step 2: Try direct parse
    try:
        result = json.loads(stripped)
        logger.info("_extract_json direct parse OK", result_type=type(result).__name__,
                     has_mapping="proposed_iris_mapping" in result if isinstance(result, dict) else "N/A")
        return result
    except (json.JSONDecodeError, TypeError) as e:
        logger.info("_extract_json direct parse failed", error=str(e)[:100])

    # Step 3: Find the LARGEST valid JSON object by depth-matching braces
    best_result = None
    best_size = 0

    for start_char, end_char in [("{", "}"), ("[", "]")]:
        # Track if we're inside a string to avoid false brace matches
        start = stripped.find(start_char)
        if start == -1:
            continue
        depth = 0
        in_string = False
        escape = False
        for i in range(start, len(stripped)):
            c = stripped[i]
            if escape:
                escape = False
                continue
            if c == '\\':
                escape = True
                continue
            if c == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if c == start_char:
                depth += 1
            elif c == end_char:
                depth -= 1
            if depth == 0:
                candidate = stripped[start : i + 1]
                if len(candidate) > best_size:
                    try:
                        parsed = json.loads(candidate)
                        best_result = parsed
                        best_size = len(candidate)
                    except json.JSONDecodeError:
                        pass
                break

    return best_result


async def _analyze_project_async(project_id: str, tenant_id: str):
    """Async implementation of project analysis."""
    storage = get_storage()
    agent = AnalysisAgent()
    jar_parser = JARParser()
    mirth_parser = MirthParser()

    with SyncSession() as session:
        project = session.get(Project, uuid.UUID(project_id))
        if not project:
            logger.error("Project not found", project_id=project_id)
            return

        project.status = "analyzing"
        session.commit()

        files = await storage.list_files(f"{tenant_id}/{project_id}/")
        source_files = [f for f in files if not f["key"].split("/")[-1].startswith("images")]

        analyzed = 0
        failed = 0

        for file_info in source_files:
            key = file_info["key"]
            filename = file_info["filename"]

            try:
                content = await storage.get_file(key)

                # Determine file type and parse
                if filename.endswith((".jar", ".zip")):
                    parsed = jar_parser.parse(content)
                    result = await agent.analyze_soa_composite(
                        composite_xml=parsed.get("composite_xml", ""),
                        bpel_files=parsed.get("bpel_files", {}),
                        xsl_files=parsed.get("xsl_files", {}),
                    )
                elif filename.endswith(".xml"):
                    xml_content = content.decode("utf-8")
                    parsed = mirth_parser.parse(xml_content)
                    result = await agent.analyze_mirth_channel(xml_content)
                else:
                    logger.info("Skipping unsupported file type", filename=filename)
                    continue

                analysis = _extract_json(result.get("content", ""))
                if not analysis:
                    logger.warning("Failed to parse analysis JSON", filename=filename)
                    failed += 1
                    continue

                # Handle case where Claude returns an array
                if isinstance(analysis, list):
                    best = None
                    for item in analysis:
                        if isinstance(item, dict) and ("proposed_iris_mapping" in item or "component_name" in item):
                            best = item
                            break
                    analysis = best if best else (analysis[0] if analysis and isinstance(analysis[0], dict) else {"component_name": filename, "type": "unknown"})

                component = SourceComponent(
                    project_id=uuid.UUID(project_id),
                    tenant_id=uuid.UUID(tenant_id),
                    name=analysis.get("component_name", filename),
                    component_type=analysis.get("type", "unknown"),
                    source_file_s3_key=key,
                    analysis_result=analysis,
                    exposed_services=analysis.get("exposed_services", []),
                    external_references=analysis.get("external_references", []),
                    hl7_messages=analysis.get("hl7_messages", []),
                    complexity=analysis.get("complexity"),
                    status="analyzed",
                )
                session.add(component)
                session.commit()
                analyzed += 1

                logger.info(
                    "Component analyzed",
                    filename=filename,
                    component_type=component.component_type,
                    complexity=component.complexity,
                )

            except Exception as e:
                logger.error("Analysis failed for file", filename=filename, error=str(e))
                failed += 1
                continue

        project.status = "analyzed" if failed == 0 else "analysis_partial"
        session.commit()

        logger.info(
            "Project analysis complete",
            project_id=project_id,
            analyzed=analyzed,
            failed=failed,
        )

        # Send webhook notification
        tenant = session.get(Tenant, uuid.UUID(tenant_id))
        if tenant and tenant.settings:
            webhook_url = tenant.settings.get("webhook_url")
            if webhook_url and tenant.settings.get("notify_on_analysis", True):
                from src.services.notifications import NotificationService
                import asyncio
                asyncio.run(NotificationService().notify_analysis_complete(
                    webhook_url, project.name, analyzed,
                ))


async def _analyze_image_async(project_id: str, tenant_id: str, image_key: str):
    """Async implementation of image analysis."""
    import base64

    storage = get_storage()
    agent = AnalysisAgent()

    content = await storage.get_file(image_key)
    image_b64 = base64.b64encode(content).decode("utf-8")

    ext = image_key.rsplit(".", 1)[-1].lower()
    media_type_map = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif"}
    media_type = media_type_map.get(ext, "image/png")

    result = await agent.analyze_image(image_b64, media_type)
    analysis = _extract_json(result.get("content", ""))

    with SyncSession() as session:
        component = SourceComponent(
            project_id=uuid.UUID(project_id),
            tenant_id=uuid.UUID(tenant_id),
            name=analysis.get("component_name", image_key.split("/")[-1]) if analysis else image_key.split("/")[-1],
            component_type="diagram_analysis",
            source_file_s3_key=image_key,
            analysis_result=analysis,
            complexity=analysis.get("complexity") if analysis else None,
            status="analyzed" if analysis else "analysis_failed",
        )
        session.add(component)
        session.commit()


async def _analyze_single_file_async(project_id: str, tenant_id: str, file_key: str):
    """Analyze a single uploaded file."""
    storage = get_storage()
    agent = AnalysisAgent()
    jar_parser = JARParser()
    mirth_parser = MirthParser()

    content = await storage.get_file(file_key)
    filename = file_key.split("/")[-1]

    if filename.endswith((".jar", ".zip")):
        parsed = jar_parser.parse(content)
        result = await agent.analyze_soa_composite(
            composite_xml=parsed.get("composite_xml", ""),
            bpel_files=parsed.get("bpel_files", {}),
            xsl_files=parsed.get("xsl_files", {}),
        )
    elif filename.endswith(".xml"):
        xml_content = content.decode("utf-8")
        parsed = mirth_parser.parse(xml_content)
        result = await agent.analyze_mirth_channel(xml_content)
    else:
        logger.info("Unsupported file type", filename=filename)
        return

    analysis = _extract_json(result.get("content", ""))
    if not analysis:
        logger.warning("Failed to parse analysis JSON", filename=filename)
        return

    # Handle case where Claude returns an array instead of a dict
    if isinstance(analysis, list):
        # Find the element that looks like a full analysis (has proposed_iris_mapping or component_name)
        best = None
        for item in analysis:
            if isinstance(item, dict) and ("proposed_iris_mapping" in item or "component_name" in item):
                best = item
                break
        if not best:
            best = analysis[0] if len(analysis) > 0 and isinstance(analysis[0], dict) else {}
        analysis = best if best else {"component_name": filename, "type": "unknown"}

    # Validate we have minimum required fields
    if "proposed_iris_mapping" not in analysis and "component_name" not in analysis:
        logger.warning("Analysis response missing required fields, re-wrapping", filename=filename)
        analysis = {"component_name": filename, "type": "unknown", "raw_analysis": analysis}

    with SyncSession() as session:
        component = SourceComponent(
            project_id=uuid.UUID(project_id),
            tenant_id=uuid.UUID(tenant_id),
            name=analysis.get("component_name", filename),
            component_type=analysis.get("type", "unknown"),
            source_file_s3_key=file_key,
            analysis_result=analysis,
            exposed_services=analysis.get("exposed_services", []),
            external_references=analysis.get("external_references", []),
            hl7_messages=analysis.get("hl7_messages", []),
            complexity=analysis.get("complexity"),
            status="analyzed",
        )
        session.add(component)
        session.commit()
        logger.info("Single file analyzed", filename=filename, component=component.name)


@celery_app.task(name="analyze_single_file", bind=True, max_retries=1)
def analyze_single_file_task(self, project_id: str, tenant_id: str, file_key: str):
    """Celery task: analyze a single uploaded file."""
    try:
        asyncio.run(_analyze_single_file_async(project_id, tenant_id, file_key))
    except Exception as exc:
        logger.error("analyze_single_file_task failed", file_key=file_key, error=str(exc))
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(name="analyze_project", bind=True, max_retries=1)
def analyze_project_task(self, project_id: str, tenant_id: str):
    """Celery task: analyze all uploaded files in a project."""
    try:
        asyncio.run(_analyze_project_async(project_id, tenant_id))
    except Exception as exc:
        logger.error("analyze_project_task failed", project_id=project_id, error=str(exc))
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(name="analyze_image", bind=True, max_retries=1)
def analyze_image_task(self, project_id: str, tenant_id: str, image_key: str):
    """Celery task: analyze an uploaded image."""
    try:
        asyncio.run(_analyze_image_async(project_id, tenant_id, image_key))
    except Exception as exc:
        logger.error("analyze_image_task failed", image_key=image_key, error=str(exc))
        raise self.retry(exc=exc, countdown=30)

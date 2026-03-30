"""Code generation Celery tasks — generate ObjectScript and validate"""

import asyncio
import hashlib
import uuid

import structlog

from src.config import settings
from src.db import SyncSession
from src.models.generated_class import GeneratedClass
from src.models.mapping import Mapping
from src.models.project import Project
from src.models.source_component import SourceComponent
from src.services.agents.codegen_agent import CodeGenAgent
from src.services.agents.validation_agent import ValidationAgent
from src.services.storage import get_storage
from src.workers import celery_app

logger = structlog.get_logger()

MAX_RETRIES = 3


async def _generate_single_mapping(
    mapping_id: str,
    project_id: str,
    tenant_id: str,
    feedback: str | None = None,
):
    """Generate ObjectScript for a single mapping."""
    storage = get_storage()
    codegen = CodeGenAgent()
    validator = ValidationAgent()

    with SyncSession() as session:
        mapping = session.get(Mapping, uuid.UUID(mapping_id))
        if not mapping:
            logger.error("Mapping not found", mapping_id=mapping_id)
            return

        project = session.get(Project, uuid.UUID(project_id))

        # Get source component analysis
        analysis = {}
        if mapping.source_component_id:
            component = session.get(SourceComponent, mapping.source_component_id)
            if component:
                analysis = component.analysis_result or {}

        # Get existing classes in project for context
        existing = session.query(GeneratedClass.class_name).filter(
            GeneratedClass.project_id == uuid.UUID(project_id),
            GeneratedClass.validation_status == "passed",
        ).all()
        existing_classes = [c[0] for c in existing]

        # Build mapping dict for agent
        mapping_dict = {
            "target_class_name": mapping.target_class_name,
            "target_type": mapping.target_type,
            "target_extends": mapping.target_extends,
            "iris_layer": mapping.iris_layer,
            "settings": mapping.settings,
        }

        # Generate with retry on validation failure
        code = None
        validation_result = None
        attempt_feedback = feedback

        for attempt in range(MAX_RETRIES):
            messages = [{"role": "user", "content": _build_generation_prompt(
                analysis, mapping_dict, existing_classes, attempt_feedback
            )}]

            result = await codegen.run(messages)
            code = result.get("content", "").strip()

            # Remove markdown code blocks if present
            if code.startswith("```"):
                lines = code.split("\n")
                code = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

            if not code:
                logger.warning("Empty code generation", mapping_id=mapping_id, attempt=attempt)
                continue

            # Validate
            validation_result = await validator.validate(code, analysis)

            if validation_result.get("passed", False):
                logger.info("Validation passed", mapping_id=mapping_id, attempt=attempt)
                break

            # Build feedback from issues for retry
            issues = validation_result.get("issues", [])
            errors = [i for i in issues if i.get("severity") == "error"]
            if errors:
                attempt_feedback = "Fix these validation errors:\n" + "\n".join(
                    f"- {e['rule']}: {e['message']}" for e in errors
                )
                logger.info("Retrying with feedback", mapping_id=mapping_id, attempt=attempt, errors=len(errors))
            else:
                break  # Only warnings, acceptable

        if not code:
            logger.error("Code generation failed after retries", mapping_id=mapping_id)
            return

        # Store generated code
        s3_key = f"{tenant_id}/{project_id}/generated/{mapping.target_class_name.replace('.', '/')}.cls"
        await storage.put_file(s3_key, code.encode("utf-8"), "text/plain")

        content_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()

        # Check if existing GeneratedClass for this mapping
        existing_gc = session.query(GeneratedClass).filter(
            GeneratedClass.mapping_id == uuid.UUID(mapping_id),
        ).first()

        usage = result.get("usage", {})

        if existing_gc:
            existing_gc.s3_key = s3_key
            existing_gc.version = existing_gc.version + 1
            existing_gc.content_hash = content_hash
            existing_gc.generation_model = codegen.model
            existing_gc.generation_prompt_tokens = usage.get("input_tokens")
            existing_gc.generation_completion_tokens = usage.get("output_tokens")
            existing_gc.validation_status = "passed" if validation_result.get("passed") else "failed"
            existing_gc.validation_issues = validation_result.get("issues", [])
        else:
            gc = GeneratedClass(
                mapping_id=uuid.UUID(mapping_id),
                project_id=uuid.UUID(project_id),
                tenant_id=uuid.UUID(tenant_id),
                class_name=mapping.target_class_name,
                s3_key=s3_key,
                content_hash=content_hash,
                generation_model=codegen.model,
                generation_prompt_tokens=usage.get("input_tokens"),
                generation_completion_tokens=usage.get("output_tokens"),
                validation_status="passed" if validation_result.get("passed") else "failed",
                validation_issues=validation_result.get("issues", []),
            )
            session.add(gc)

        session.commit()
        logger.info("Generated class saved", class_name=mapping.target_class_name, status=validation_result.get("passed"))


def _build_generation_prompt(
    analysis: dict,
    mapping: dict,
    existing_classes: list[str],
    feedback: str | None = None,
) -> str:
    """Build the user message for CodeGen agent."""
    parts = [
        f"## Component Analysis\n```json\n{_safe_json(analysis)}\n```",
        f"\n## Mapping\n- Target class: {mapping['target_class_name']}",
        f"- Type: {mapping['target_type']}",
        f"- Extends: {mapping.get('target_extends', 'N/A')}",
        f"- Layer: {mapping.get('iris_layer', 'N/A')}",
        f"- Settings: {mapping.get('settings', {})}",
    ]

    if existing_classes:
        parts.append(f"\n## Existing classes in project\n" + "\n".join(f"- {c}" for c in existing_classes[:20]))

    if feedback:
        parts.append(f"\n## IMPORTANT: Fix these issues from previous attempt\n{feedback}")

    parts.append("\nGenerate the complete .cls file. Output ONLY the ObjectScript code, no markdown.")

    return "\n".join(parts)


def _safe_json(data: dict) -> str:
    import json
    try:
        return json.dumps(data, indent=2, default=str)
    except Exception:
        return str(data)


@celery_app.task(name="generate_project", bind=True, max_retries=0)
def generate_project_task(self, project_id: str, tenant_id: str):
    """Generate ObjectScript for all confirmed mappings in a project."""
    with SyncSession() as session:
        mappings = session.query(Mapping).filter(
            Mapping.project_id == uuid.UUID(project_id),
            Mapping.tenant_id == uuid.UUID(tenant_id),
            Mapping.confirmed_by.isnot(None),
        ).all()

        mapping_ids = [str(m.id) for m in mappings]

    for mid in mapping_ids:
        try:
            asyncio.run(_generate_single_mapping(mid, project_id, tenant_id))
        except Exception as e:
            logger.error("Generation failed", mapping_id=mid, error=str(e))

    # Update project status
    with SyncSession() as session:
        project = session.get(Project, uuid.UUID(project_id))
        if project:
            project.status = "generated"
            session.commit()


@celery_app.task(name="generate_mapping", bind=True, max_retries=1)
def generate_mapping_task(self, mapping_id: str, project_id: str, tenant_id: str, feedback: str | None = None):
    """Generate ObjectScript for a single mapping."""
    try:
        asyncio.run(_generate_single_mapping(mapping_id, project_id, tenant_id, feedback))
    except Exception as exc:
        logger.error("generate_mapping_task failed", mapping_id=mapping_id, error=str(exc))
        raise self.retry(exc=exc, countdown=30)

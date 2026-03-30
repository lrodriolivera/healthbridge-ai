"""Auto-mapping service — generates Mapping records from analysis results"""

import json
import uuid
from pathlib import Path

import structlog

from src.models.mapping import Mapping
from src.models.source_component import SourceComponent

logger = structlog.get_logger()

# Layer map: proposed_iris_mapping key → (target_type, iris_layer)
_LAYER_MAP = {
    "BS": ("BusinessService", "BS"),
    "BP": ("BusinessProcess", "BP"),
    "BO": ("BusinessOperation", "BO"),
    "DTL": ("DTL", "DTL"),
    "MSG": ("Message", "MSG"),
}


def _load_equivalence_table(source_platform: str) -> list[dict]:
    """Load equivalence table for the source platform."""
    base = Path(__file__).parent.parent.parent.parent / "knowledge-base" / "equivalence-tables"
    if "mirth" in source_platform:
        path = base / "mirth-to-iris.json"
    else:
        path = base / "soa-to-iris.json"

    if path.exists():
        data = json.loads(path.read_text())
        if isinstance(data, list):
            return data
        return data.get("mappings", [])
    return []


def _find_base_class(iris_type: str, equivalences: list[dict]) -> str | None:
    """Look up base class from equivalence table."""
    for eq in equivalences:
        if eq.get("iris_type") == iris_type or eq.get("iris_base_class") == iris_type:
            return eq.get("iris_base_class")
    return None


def generate_mappings_for_component(
    component: SourceComponent,
    project_id: uuid.UUID,
    tenant_id: uuid.UUID,
    source_platform: str,
) -> list[Mapping]:
    """Generate Mapping records from a component's proposed_iris_mapping."""
    analysis = component.analysis_result
    if not analysis:
        return []

    proposed = analysis.get("proposed_iris_mapping", {})
    if not proposed:
        return []

    equivalences = _load_equivalence_table(source_platform)
    mappings = []

    for layer_key, (target_type, iris_layer) in _LAYER_MAP.items():
        items = proposed.get(layer_key, [])
        if not items:
            continue

        for item in items:
            if isinstance(item, str):
                class_name = item
                extends = None
            elif isinstance(item, dict):
                class_name = item.get("class_name", item.get("name", f"Unknown_{layer_key}"))
                extends = item.get("extends", item.get("base_class"))
            else:
                continue

            if not extends:
                extends = _find_base_class(target_type, equivalences)

            mapping = Mapping(
                project_id=project_id,
                tenant_id=tenant_id,
                source_component_id=component.id,
                target_class_name=class_name,
                target_type=target_type,
                target_extends=extends,
                iris_layer=iris_layer,
                auto_generated=True,
            )
            mappings.append(mapping)

    logger.info(
        "Generated mappings for component",
        component=component.name,
        count=len(mappings),
    )
    return mappings

"""Field-level mapping extraction — provides detailed source→target field mappings"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.tenant import get_current_tenant
from src.models.generated_class import GeneratedClass
from src.models.mapping import Mapping
from src.models.source_component import SourceComponent
from src.models.tenant import Tenant
from src.routers.deps import get_project_for_tenant
from src.models.project import Project
from src.services.storage import get_storage

router = APIRouter()


def _extract_hl7_segments(analysis: dict) -> list[dict]:
    """Extract HL7 segment definitions from analysis."""
    segments = []
    hl7_msgs = analysis.get("hl7_messages", [])
    business_logic = analysis.get("business_logic", "")
    transformations = analysis.get("transformations", [])

    # Common HL7 2.x segments with their standard fields
    hl7_segment_defs = {
        "MSH": [
            ("MSH.1", "Field Separator", "|"),
            ("MSH.2", "Encoding Characters", "^~\\&"),
            ("MSH.3", "Sending Application", ""),
            ("MSH.4", "Sending Facility", ""),
            ("MSH.5", "Receiving Application", ""),
            ("MSH.6", "Receiving Facility", ""),
            ("MSH.7", "Date/Time of Message", "TS"),
            ("MSH.9", "Message Type", ""),
            ("MSH.10", "Message Control ID", ""),
            ("MSH.11", "Processing ID", ""),
            ("MSH.12", "Version ID", "2.5"),
        ],
        "PID": [
            ("PID.1", "Set ID", "SI"),
            ("PID.3", "Patient Identifier List", "CX"),
            ("PID.5", "Patient Name", "XPN"),
            ("PID.7", "Date/Time of Birth", "TS"),
            ("PID.8", "Administrative Sex", "IS"),
            ("PID.11", "Patient Address", "XAD"),
            ("PID.13", "Phone Number - Home", "XTN"),
        ],
        "PV1": [
            ("PV1.1", "Set ID", "SI"),
            ("PV1.2", "Patient Class", "IS"),
            ("PV1.3", "Assigned Patient Location", "PL"),
            ("PV1.7", "Attending Doctor", "XCN"),
            ("PV1.14", "Admit Source", "IS"),
            ("PV1.19", "Visit Number", "CX"),
            ("PV1.44", "Admit Date/Time", "TS"),
        ],
        "EVN": [
            ("EVN.1", "Event Type Code", "ID"),
            ("EVN.2", "Recorded Date/Time", "TS"),
            ("EVN.6", "Event Occurred", "TS"),
        ],
        "ORC": [
            ("ORC.1", "Order Control", "ID"),
            ("ORC.2", "Placer Order Number", "EI"),
            ("ORC.3", "Filler Order Number", "EI"),
            ("ORC.5", "Order Status", "ID"),
            ("ORC.9", "Date/Time of Transaction", "TS"),
            ("ORC.12", "Ordering Provider", "XCN"),
        ],
        "OBR": [
            ("OBR.1", "Set ID", "SI"),
            ("OBR.2", "Placer Order Number", "EI"),
            ("OBR.4", "Universal Service Identifier", "CE"),
            ("OBR.7", "Observation Date/Time", "TS"),
            ("OBR.16", "Ordering Provider", "XCN"),
        ],
        "FT1": [
            ("FT1.1", "Set ID", "SI"),
            ("FT1.4", "Transaction Date", "DR"),
            ("FT1.6", "Transaction Type", "IS"),
            ("FT1.7", "Transaction Code", "CE"),
            ("FT1.10", "Transaction Quantity", "NM"),
        ],
    }

    # Determine which segments are relevant based on message types
    mentioned_segments = set()
    full_text = str(analysis)
    for seg in hl7_segment_defs:
        if seg in full_text:
            mentioned_segments.add(seg)

    # Always include MSH
    mentioned_segments.add("MSH")

    for seg_name in sorted(mentioned_segments):
        fields = hl7_segment_defs.get(seg_name, [])
        segments.append({
            "segment": seg_name,
            "fields": [{"id": f[0], "name": f[1], "type": f[2]} for f in fields],
        })

    return segments


def _extract_field_mappings(analysis: dict, mappings: list[dict]) -> list[dict]:
    """Extract field-level source→target mappings from analysis transformations."""
    field_maps = []
    transformations = analysis.get("transformations", [])

    for t in transformations:
        desc = t.get("description", "")
        t_name = t.get("name", "Unknown")
        t_type = t.get("type", "")

        # Extract field references from description
        import re
        # Match patterns like MSH.7, PID.3, PV1.2, ORC.1, etc.
        field_refs = re.findall(r'(MSH|PID|PV1|PV2|EVN|ORC|OBR|OBX|FT1|NK1|NTE|SIU)[\.\:](\d+(?:\.\d+)?)', desc)

        source_fields = []
        seen = set()
        for seg, field_num in field_refs:
            field_id = f"{seg}.{field_num}"
            if field_id not in seen:
                source_fields.append(field_id)
                seen.add(field_id)

        field_maps.append({
            "transformation": t_name,
            "type": t_type,
            "description": desc[:500],
            "source_fields": source_fields,
        })

    return field_maps


@router.get("/{project_id}/field-mappings")
async def get_field_mappings(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed field-level mapping data for the visual mapper."""

    # Get components with analysis
    comp_result = await db.execute(
        select(SourceComponent).where(
            SourceComponent.project_id == project.id,
            SourceComponent.tenant_id == tenant.id,
            SourceComponent.status == "analyzed",
        )
    )
    components = comp_result.scalars().all()

    # Get mappings
    map_result = await db.execute(
        select(Mapping).where(
            Mapping.project_id == project.id,
            Mapping.tenant_id == tenant.id,
        )
    )
    mappings = map_result.scalars().all()

    # Get generated classes
    gen_result = await db.execute(
        select(GeneratedClass).where(
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
        )
    )
    generated = gen_result.scalars().all()
    gen_by_mapping = {str(g.mapping_id): g for g in generated}

    # Build response
    component_details = []
    for comp in components:
        analysis = comp.analysis_result or {}
        comp_mappings = [m for m in mappings if str(m.source_component_id) == str(comp.id)]

        hl7_segments = _extract_hl7_segments(analysis)
        field_maps = _extract_field_mappings(analysis, comp_mappings)

        target_classes = []
        for m in comp_mappings:
            gc = gen_by_mapping.get(str(m.id))
            target_classes.append({
                "mapping_id": str(m.id),
                "class_name": m.target_class_name,
                "target_type": m.target_type,
                "iris_layer": m.iris_layer,
                "extends": m.target_extends,
                "confirmed": m.confirmed_by is not None,
                "generated": gc is not None,
                "validation_status": gc.validation_status if gc else None,
            })

        component_details.append({
            "component_id": str(comp.id),
            "name": comp.name,
            "component_type": comp.component_type,
            "complexity": comp.complexity,
            "description": analysis.get("description", ""),
            "hl7_messages": analysis.get("hl7_messages", []),
            "hl7_segments": hl7_segments,
            "transformations": field_maps,
            "business_logic": analysis.get("business_logic", ""),
            "source_services": analysis.get("exposed_services", []),
            "external_references": analysis.get("external_references", []),
            "target_classes": target_classes,
        })

    # Get code preview for generated classes
    storage = get_storage()
    code_previews = {}
    for g in generated[:20]:  # Limit to 20
        try:
            content = await storage.get_file(g.s3_key)
            code_previews[str(g.mapping_id)] = content.decode("utf-8")[:3000]
        except Exception:
            pass

    return {
        "components": component_details,
        "code_previews": code_previews,
        "summary": {
            "total_components": len(components),
            "total_mappings": len(mappings),
            "confirmed_mappings": sum(1 for m in mappings if m.confirmed_by),
            "generated_classes": len(generated),
            "passed_validation": sum(1 for g in generated if g.validation_status == "passed"),
        },
    }

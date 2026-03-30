"""Migration Diff Report — compares original analysis with generated code"""


def generate_diff_report(
    component_name: str,
    analysis: dict,
    mappings: list[dict],
    generated_classes: list[dict],
    code_previews: dict[str, str],
) -> dict:
    """Generate a diff report comparing original analysis with generated IRIS code."""

    # Original capabilities from analysis
    original = {
        "services": analysis.get("exposed_services", []),
        "references": analysis.get("external_references", []),
        "hl7_messages": analysis.get("hl7_messages", []),
        "transformations": analysis.get("transformations", []),
        "complexity": analysis.get("complexity", "unknown"),
    }

    # Generated capabilities
    generated = {
        "total_classes": len(generated_classes),
        "passed": sum(1 for g in generated_classes if g.get("validation_status") == "passed"),
        "failed": sum(1 for g in generated_classes if g.get("validation_status") == "failed"),
        "by_layer": {},
    }

    for g in generated_classes:
        layer = g.get("iris_layer", "unknown")
        if layer not in generated["by_layer"]:
            generated["by_layer"][layer] = []
        generated["by_layer"][layer].append(g.get("class_name", "?"))

    # Coverage analysis
    coverage = {
        "services_covered": [],
        "services_missing": [],
        "references_covered": [],
        "references_missing": [],
        "hl7_covered": [],
        "hl7_missing": [],
    }

    # Check service coverage
    code_text = " ".join(code_previews.values()).lower() if code_previews else ""

    for svc in original["services"]:
        svc_name = svc.get("name", "") if isinstance(svc, dict) else str(svc)
        if svc_name.lower().replace(" ", "").replace("_", "") in code_text.replace(" ", "").replace("_", ""):
            coverage["services_covered"].append(svc_name)
        else:
            coverage["services_missing"].append(svc_name)

    for ref in original["references"]:
        ref_name = ref.get("name", "") if isinstance(ref, dict) else str(ref)
        if ref_name.lower().replace(" ", "").replace("_", "") in code_text.replace(" ", "").replace("_", ""):
            coverage["references_covered"].append(ref_name)
        else:
            coverage["references_missing"].append(ref_name)

    for msg in original["hl7_messages"]:
        msg_type = msg.get("type", "") if isinstance(msg, dict) else str(msg)
        if msg_type.lower() in code_text:
            coverage["hl7_covered"].append(msg_type)
        else:
            coverage["hl7_missing"].append(msg_type)

    # Score
    total_items = len(original["services"]) + len(original["references"]) + len(original["hl7_messages"])
    covered_items = len(coverage["services_covered"]) + len(coverage["references_covered"]) + len(coverage["hl7_covered"])
    coverage_pct = round((covered_items / total_items * 100) if total_items > 0 else 100, 1)

    return {
        "component": component_name,
        "complexity": original["complexity"],
        "original": original,
        "generated": generated,
        "coverage": coverage,
        "coverage_percentage": coverage_pct,
        "summary": {
            "total_original_items": total_items,
            "covered": covered_items,
            "missing": total_items - covered_items,
            "classes_generated": generated["total_classes"],
            "classes_passed": generated["passed"],
        },
    }

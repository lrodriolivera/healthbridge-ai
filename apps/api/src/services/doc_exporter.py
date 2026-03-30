"""Documentation exporter — generates Markdown documentation for migration projects"""

from datetime import datetime

from src.models.generated_class import GeneratedClass
from src.models.mapping import Mapping
from src.models.project import Project
from src.models.source_component import SourceComponent
from src.models.test_result import TestResult


def export_project_documentation(
    project: Project,
    components: list[SourceComponent],
    mappings: list[Mapping],
    generated_classes: list[GeneratedClass],
    test_results: list[TestResult],
) -> str:
    """Generate comprehensive Markdown documentation for a migration project."""
    lines = []

    # Header
    lines.append(f"# Migration Documentation: {project.name}")
    lines.append(f"\n**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    lines.append(f"**Source Platform:** {project.source_platform}")
    lines.append(f"**Target Platform:** {project.target_platform}")
    lines.append(f"**Status:** {project.status}")
    lines.append("")

    # Summary
    lines.append("## Summary")
    lines.append(f"- **Components discovered:** {len(components)}")
    lines.append(f"- **Mappings created:** {len(mappings)}")
    confirmed = sum(1 for m in mappings if m.confirmed_by)
    lines.append(f"- **Mappings confirmed:** {confirmed}")
    lines.append(f"- **Classes generated:** {len(generated_classes)}")
    passed = sum(1 for gc in generated_classes if gc.validation_status == "passed")
    lines.append(f"- **Validation passed:** {passed}/{len(generated_classes)}")
    if test_results:
        test_passed = sum(1 for tr in test_results if tr.status == "pass")
        lines.append(f"- **Tests passed:** {test_passed}/{len(test_results)}")
    lines.append("")

    # Pipeline
    lines.append("## Migration Pipeline")
    lines.append("```")
    lines.append("Upload → Parse → Analyze → Map → Generate → Validate → Deploy → Test")
    lines.append("```")
    lines.append("")

    # Components
    if components:
        lines.append("## Source Components")
        lines.append("")
        for comp in components:
            lines.append(f"### {comp.name}")
            lines.append(f"- **Type:** {comp.component_type}")
            lines.append(f"- **Complexity:** {comp.complexity or 'N/A'}")
            lines.append(f"- **Status:** {comp.status}")

            if comp.exposed_services:
                lines.append(f"- **Exposed Services:** {len(comp.exposed_services)}")
                for svc in comp.exposed_services:
                    if isinstance(svc, dict):
                        lines.append(f"  - {svc.get('name', 'Unknown')} ({svc.get('type', '')}, port {svc.get('port', 'N/A')})")

            if comp.hl7_messages:
                lines.append(f"- **HL7 Messages:** {len(comp.hl7_messages)}")
                for msg in comp.hl7_messages:
                    if isinstance(msg, dict):
                        lines.append(f"  - {msg.get('type', 'Unknown')} ({msg.get('direction', '')})")

            if comp.external_references:
                lines.append(f"- **External References:** {len(comp.external_references)}")
                for ref in comp.external_references:
                    if isinstance(ref, dict):
                        lines.append(f"  - {ref.get('name', 'Unknown')}: {ref.get('url', 'N/A')}")

            lines.append("")

    # Mappings
    if mappings:
        lines.append("## Mappings (Source → IRIS)")
        lines.append("")
        lines.append("| Source Component | Target Class | Type | Layer | Confirmed |")
        lines.append("|---|---|---|---|---|")
        for m in mappings:
            source_name = "Manual" if not m.source_component_id else "Auto"
            confirmed_mark = "Yes" if m.confirmed_by else "No"
            lines.append(f"| {source_name} | `{m.target_class_name}` | {m.target_type} | {m.iris_layer or 'N/A'} | {confirmed_mark} |")
        lines.append("")

    # Generated Classes
    if generated_classes:
        lines.append("## Generated Classes")
        lines.append("")
        lines.append("| Class Name | Version | Validation | Deploy |")
        lines.append("|---|---|---|---|")
        for gc in generated_classes:
            deploy_status = gc.deploy_status.get("status", "pending") if gc.deploy_status else "pending"
            lines.append(f"| `{gc.class_name}` | v{gc.version} | {gc.validation_status or 'pending'} | {deploy_status} |")
        lines.append("")

    # Compilation Order
    if generated_classes:
        lines.append("## Compilation Order")
        lines.append("```")
        lines.append("1. Framework/Common/Utils")
        lines.append("2. Messages (MSG)")
        lines.append("3. Business Operations (BO)")
        lines.append("4. Business Processes (BP)")
        lines.append("5. Business Services (BS)")
        lines.append("6. DTL Transformations")
        lines.append("7. Production.cls")
        lines.append("```")
        lines.append("")

    # Test Results
    if test_results:
        lines.append("## Test Results")
        lines.append("")
        test_passed = sum(1 for tr in test_results if tr.status == "pass")
        test_failed = sum(1 for tr in test_results if tr.status == "fail")
        test_errors = sum(1 for tr in test_results if tr.status == "error")
        lines.append(f"- **Passed:** {test_passed}")
        lines.append(f"- **Failed:** {test_failed}")
        lines.append(f"- **Errors:** {test_errors}")

        times = [tr.response_time_ms for tr in test_results if tr.response_time_ms]
        if times:
            lines.append(f"- **Avg Response Time:** {sum(times) / len(times):.0f}ms")
        lines.append("")

    # Deploy History
    deploy_history = (project.metadata_ or {}).get("deploy_history", [])
    if deploy_history:
        lines.append("## Deploy History")
        lines.append("")
        for entry in deploy_history[:5]:
            lines.append(f"- **{entry.get('deployed_at', 'N/A')}** → {entry.get('iris_connection_name', 'Unknown')} ({entry.get('namespace', '')}) — {entry.get('successful', 0)}/{entry.get('total_classes', 0)} successful")
        lines.append("")

    lines.append("---")
    lines.append("*Generated by HealthBridge AI*")

    return "\n".join(lines)


def export_project_summary(
    project: Project,
    components: list[SourceComponent],
    mappings: list[Mapping],
    generated_classes: list[GeneratedClass],
    test_results: list[TestResult],
) -> dict:
    """Generate a JSON summary of the project."""
    passed_gen = sum(1 for gc in generated_classes if gc.validation_status == "passed")
    test_passed = sum(1 for tr in test_results if tr.status == "pass")

    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "source_platform": project.source_platform,
            "target_platform": project.target_platform,
            "status": project.status,
        },
        "components": {"total": len(components)},
        "mappings": {
            "total": len(mappings),
            "confirmed": sum(1 for m in mappings if m.confirmed_by),
        },
        "generated_classes": {
            "total": len(generated_classes),
            "passed": passed_gen,
            "failed": len(generated_classes) - passed_gen,
        },
        "tests": {
            "total": len(test_results),
            "passed": test_passed,
            "failed": sum(1 for tr in test_results if tr.status == "fail"),
            "errors": sum(1 for tr in test_results if tr.status == "error"),
        },
    }

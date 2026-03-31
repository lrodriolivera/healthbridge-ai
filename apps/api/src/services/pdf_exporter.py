"""PDF documentation exporter using ReportLab"""

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)


def export_project_pdf(project, components, mappings, generated_classes, test_results) -> bytes:
    """Generate PDF documentation for a migration project."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title", parent=styles["Title"], textColor=colors.HexColor("#0d9488"))
    h2_style = ParagraphStyle("H2", parent=styles["Heading2"], textColor=colors.HexColor("#1e293b"))

    elements = []

    # Title
    elements.append(Paragraph(f"Migration Documentation: {project.name}", title_style))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
    elements.append(Paragraph(f"Source: {project.source_platform} | Target: {project.target_platform} | Status: {project.status}", styles["Normal"]))
    elements.append(Spacer(1, 24))

    # Summary
    elements.append(Paragraph("Summary", h2_style))
    confirmed = sum(1 for m in mappings if m.confirmed_by)
    passed = sum(1 for gc in generated_classes if gc.validation_status == "passed")
    test_passed = sum(1 for tr in test_results if tr.status == "pass")

    summary_data = [
        ["Metric", "Count"],
        ["Components Discovered", str(len(components))],
        ["Mappings Created", str(len(mappings))],
        ["Mappings Confirmed", str(confirmed)],
        ["Classes Generated", str(len(generated_classes))],
        ["Validation Passed", f"{passed}/{len(generated_classes)}"],
        ["Tests Passed", f"{test_passed}/{len(test_results)}"],
    ]
    t = Table(summary_data, colWidths=[3 * inch, 2 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d9488")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 24))

    # Components
    if components:
        elements.append(Paragraph("Source Components", h2_style))
        for comp in components:
            elements.append(Paragraph(f"<b>{comp.name}</b> — {comp.component_type} ({comp.complexity or 'N/A'})", styles["Normal"]))
            if comp.exposed_services:
                svcs = ", ".join(s.get("name", "?") if isinstance(s, dict) else str(s) for s in comp.exposed_services)
                elements.append(Paragraph(f"  Services: {svcs}", styles["Normal"]))
            elements.append(Spacer(1, 6))
        elements.append(Spacer(1, 12))

    # Mappings
    if mappings:
        elements.append(Paragraph("Mappings (Source → IRIS)", h2_style))
        map_data = [["Target Class", "Type", "Layer", "Confirmed"]]
        for m in mappings:
            map_data.append([m.target_class_name, m.target_type, m.iris_layer or "—", "Yes" if m.confirmed_by else "No"])

        if len(map_data) > 1:
            t = Table(map_data, colWidths=[2.5 * inch, 1.5 * inch, 0.7 * inch, 0.8 * inch])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d9488")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
            ]))
            elements.append(t)
        elements.append(Spacer(1, 12))

    # Generated Classes
    if generated_classes:
        elements.append(Paragraph("Generated ObjectScript Classes", h2_style))
        gen_data = [["Class Name", "Version", "Validation", "Deploy"]]
        for gc in generated_classes:
            deploy_st = gc.deploy_status.get("status", "pending") if gc.deploy_status else "pending"
            gen_data.append([gc.class_name, f"v{gc.version}", gc.validation_status or "pending", deploy_st])

        t = Table(gen_data, colWidths=[2.5 * inch, 0.7 * inch, 1 * inch, 1 * inch])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d9488")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 12))

    # Footer
    elements.append(Spacer(1, 24))
    elements.append(Paragraph("Generated by HealthBridge AI — Healthcare Integration Migration Platform", styles["Italic"]))

    doc.build(elements)
    return buffer.getvalue()

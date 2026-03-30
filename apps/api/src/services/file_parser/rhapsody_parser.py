"""Rhapsody route XML parser"""

import structlog
from defusedxml import ElementTree as ET

logger = structlog.get_logger()


class RhapsodyParser:
    """Parse Rhapsody Messaging Toolkit route configuration XML."""

    def parse(self, xml_content: str) -> dict:
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            raise ValueError(f"Invalid XML: {e}")

        route_name = root.get("name", root.tag)

        components = []
        for comp in root.iter():
            if comp.tag in ("inputCommunicationPoint", "outputCommunicationPoint",
                           "communicationPoint", "filter", "route", "connector"):
                components.append({
                    "name": comp.get("name", comp.tag),
                    "type": comp.tag,
                    "properties": {
                        child.tag: child.text
                        for child in comp
                        if child.text
                    },
                })

        # Extract communication points
        input_points = [c for c in components if "input" in c["type"].lower()]
        output_points = [c for c in components if "output" in c["type"].lower()]
        filters = [c for c in components if c["type"] == "filter"]

        return {
            "route_name": route_name,
            "components": components,
            "input_points": input_points,
            "output_points": output_points,
            "filters": filters,
            "total_components": len(components),
        }

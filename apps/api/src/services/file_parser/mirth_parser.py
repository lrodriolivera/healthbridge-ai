"""Mirth Parser — Parse Mirth Connect channel XML exports"""

import structlog
from defusedxml import ElementTree as ET

logger = structlog.get_logger()


class MirthParser:
    """Parses Mirth Connect channel XML exports.

    Mirth channels contain:
    - Source connector (TCP/MLLP, HTTP, File, DB)
    - Destination connectors (one or more)
    - Transformers (JavaScript, Mapper, XSLT)
    - Filters
    - Channel properties (name, description, ports)
    """

    def parse(self, xml_content: str) -> dict:
        """Parse a Mirth channel XML and extract components.

        Args:
            xml_content: Raw XML string of the Mirth channel export

        Returns:
            Structured dict with channel components
        """
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            logger.error("Failed to parse Mirth XML", error=str(e))
            raise ValueError(f"Invalid Mirth channel XML: {e}")

        result = {
            "channel_name": self._get_text(root, "name"),
            "description": self._get_text(root, "description"),
            "enabled": self._get_text(root, "enabled") == "true",
            "source_connector": self._parse_source_connector(root),
            "destination_connectors": self._parse_destination_connectors(root),
            "properties": self._parse_channel_properties(root),
        }

        logger.info(
            "Mirth channel parsed",
            name=result["channel_name"],
            destinations=len(result["destination_connectors"]),
        )

        return result

    def _parse_source_connector(self, root) -> dict:
        """Extract source connector details."""
        source = root.find(".//sourceConnector")
        if source is None:
            return {}

        connector = {
            "name": self._get_text(source, "name"),
            "transport_name": self._get_text(source, "transportName"),
            "mode": self._get_text(source, "mode"),
            "enabled": self._get_text(source, "enabled") == "true",
            "properties": {},
            "transformers": [],
            "filter": None,
        }

        # Extract properties
        props = source.find("properties")
        if props is not None:
            for child in props:
                connector["properties"][child.tag] = child.text or ""

        # Extract transformers
        transformer_el = source.find(".//transformer")
        if transformer_el is not None:
            connector["transformers"] = self._parse_transformers(transformer_el)

        # Extract filter
        filter_el = source.find(".//filter")
        if filter_el is not None:
            connector["filter"] = self._parse_filter(filter_el)

        return connector

    def _parse_destination_connectors(self, root) -> list[dict]:
        """Extract all destination connectors."""
        destinations = []
        for dest in root.findall(".//destinationConnectors/connector"):
            connector = {
                "name": self._get_text(dest, "name"),
                "transport_name": self._get_text(dest, "transportName"),
                "mode": self._get_text(dest, "mode"),
                "enabled": self._get_text(dest, "enabled") == "true",
                "properties": {},
                "transformers": [],
                "filter": None,
            }

            props = dest.find("properties")
            if props is not None:
                for child in props:
                    connector["properties"][child.tag] = child.text or ""

            transformer_el = dest.find(".//transformer")
            if transformer_el is not None:
                connector["transformers"] = self._parse_transformers(transformer_el)

            filter_el = dest.find(".//filter")
            if filter_el is not None:
                connector["filter"] = self._parse_filter(filter_el)

            destinations.append(connector)

        return destinations

    def _parse_transformers(self, transformer_el) -> list[dict]:
        """Extract transformer steps."""
        steps = []
        for step in transformer_el.findall(".//step"):
            steps.append({
                "name": self._get_text(step, "name"),
                "type": self._get_text(step, "type"),
                "script": self._get_text(step, "script"),
            })
        return steps

    def _parse_filter(self, filter_el) -> dict | None:
        """Extract filter rules."""
        rules = []
        for rule in filter_el.findall(".//rule"):
            rules.append({
                "name": self._get_text(rule, "name"),
                "type": self._get_text(rule, "type"),
                "script": self._get_text(rule, "script"),
            })
        return {"rules": rules} if rules else None

    def _parse_channel_properties(self, root) -> dict:
        """Extract general channel properties."""
        props = {}
        props_el = root.find("properties")
        if props_el is not None:
            for child in props_el:
                props[child.tag] = child.text or ""
        return props

    @staticmethod
    def _get_text(element, tag: str, default: str = "") -> str:
        """Safely get text content of a child element."""
        child = element.find(tag)
        return child.text if child is not None and child.text else default

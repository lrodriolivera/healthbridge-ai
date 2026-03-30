"""BizTalk binding file parser"""

import structlog
from defusedxml import ElementTree as ET

logger = structlog.get_logger()


class BizTalkParser:
    """Parse BizTalk Server binding XML files."""

    def parse(self, xml_content: str) -> dict:
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            raise ValueError(f"Invalid XML: {e}")

        # Parse receive locations
        receive_locations = []
        for rl in root.iter("ReceiveLocation"):
            receive_locations.append({
                "name": rl.get("Name", ""),
                "address": self._get_text(rl, "Address"),
                "transport_type": self._get_text(rl, "TransportType"),
                "receive_pipeline": self._get_text(rl, "ReceivePipeline"),
            })

        # Parse send ports
        send_ports = []
        for sp in root.iter("SendPort"):
            send_ports.append({
                "name": sp.get("Name", ""),
                "address": self._get_text(sp, "Address"),
                "transport_type": self._get_text(sp, "TransportType"),
                "send_pipeline": self._get_text(sp, "SendPipeline"),
                "is_two_way": sp.get("IsTwoWay", "false") == "true",
            })

        # Parse orchestrations
        orchestrations = []
        for orch in root.iter("Orchestration"):
            orchestrations.append({
                "name": orch.get("Name", ""),
                "assembly": orch.get("Assembly", ""),
                "ports": [
                    {"name": p.get("Name", ""), "binding": p.get("Binding", "")}
                    for p in orch.iter("Port")
                ],
            })

        # Parse transforms/maps
        transforms = []
        for t in root.iter("Transform"):
            transforms.append({
                "name": t.get("Name", ""),
                "source_schema": t.get("SourceSchema", ""),
                "target_schema": t.get("TargetSchema", ""),
            })

        return {
            "receive_locations": receive_locations,
            "send_ports": send_ports,
            "orchestrations": orchestrations,
            "transforms": transforms,
            "total_receive": len(receive_locations),
            "total_send": len(send_ports),
            "total_orchestrations": len(orchestrations),
        }

    def _get_text(self, element, tag: str, default: str = "") -> str:
        child = element.find(tag)
        if child is not None and child.text:
            return child.text
        return default

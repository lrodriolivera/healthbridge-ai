"""Analysis Agent — Analyzes source components and produces structured inventory"""

from pathlib import Path

from .base_agent import BaseAgent

PROMPTS_DIR = Path(__file__).parent / "prompts"


class AnalysisAgent(BaseAgent):
    """Analyzes source platform components (Oracle SOA, Mirth Connect, etc.)
    and produces a structured JSON inventory with proposed IRIS mappings."""

    def __init__(self):
        super().__init__(max_tokens=16384)
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        prompt_file = PROMPTS_DIR / "analysis_system.md"
        if prompt_file.exists():
            return prompt_file.read_text()
        return self._default_system_prompt()

    def _default_system_prompt(self) -> str:
        return """You are a healthcare integration specialist that analyzes source platform
components (Oracle SOA/OSB, Mirth Connect, Rhapsody, etc.) and produces structured
inventories for migration to InterSystems IRIS/TrackCare.

For each component you analyze, produce a JSON object with:
- component_name: Name of the component
- type: Source type (soa_composite, mirth_channel, etc.)
- description: Functional description of what it does
- complexity: low | medium | high | very_high
- exposed_services: List of services exposed (name, type, port, protocol)
- external_references: List of external services called (name, url, type)
- hl7_messages: List of HL7 message types handled ({type, direction})
- proposed_iris_mapping: Proposed IRIS components organized by layer (BS, BP, BO, DTL, MSG)

Classification criteria:
- low: Pass-through, simple routing, no transformation
- medium: Simple transformation, single SOAP call, basic routing
- high: Multiple SOAP calls, complex transformation, decision logic
- very_high: Embedded Java/JavaScript, complex BPEL with parallel flows, error compensation"""

    async def analyze_soa_composite(self, composite_xml: str, bpel_files: dict[str, str], xsl_files: dict[str, str]) -> dict:
        """Analyze an Oracle SOA composite and its related files.
        Truncates large files to stay within Claude's context window."""
        MAX_FILE_SIZE = 15000  # chars per file
        MAX_TOTAL_SIZE = 400000  # ~100K tokens total prompt

        content_parts = [f"## composite.xml\n```xml\n{composite_xml[:MAX_FILE_SIZE]}\n```"]
        total_size = len(composite_xml[:MAX_FILE_SIZE])

        # Include BPEL files (most important for business logic)
        for name, content in bpel_files.items():
            truncated = content[:MAX_FILE_SIZE]
            if total_size + len(truncated) > MAX_TOTAL_SIZE:
                content_parts.append(f"## BPEL: {name}\n(truncated — {len(content)} chars, showing first {MAX_FILE_SIZE})\n```xml\n{content[:5000]}\n```")
                break
            content_parts.append(f"## BPEL: {name}\n```xml\n{truncated}\n```")
            total_size += len(truncated)

        # Include XSL files (transformations)
        for name, content in xsl_files.items():
            truncated = content[:MAX_FILE_SIZE]
            if total_size + len(truncated) > MAX_TOTAL_SIZE:
                content_parts.append(f"\n(Remaining {len(xsl_files)} XSL files omitted due to size. File names: {', '.join(xsl_files.keys())})")
                break
            content_parts.append(f"## XSL: {name}\n```xml\n{truncated}\n```")
            total_size += len(truncated)

        messages = [
            {
                "role": "user",
                "content": f"""Analyze this Oracle SOA composite and produce a SINGLE JSON object (not an array) with this EXACT structure:

{{
  "component_name": "Name of the composite",
  "type": "soa_composite",
  "description": "What this composite does",
  "complexity": "low|medium|high|very_high",
  "exposed_services": [{{"name": "...", "type": "SOAP|REST|TCP", "port": 8080, "protocol": "HTTP"}}],
  "external_references": [{{"name": "...", "url": "...", "type": "SOAP|REST|MLLP"}}],
  "hl7_messages": [{{"type": "ADT^A01", "direction": "inbound|outbound", "version": "2.5"}}],
  "transformations": [{{"name": "xsl_name", "type": "XSL|BPEL_Assign", "description": "what it transforms"}}],
  "business_logic": "Step by step description of the flow",
  "proposed_iris_mapping": {{
    "BS": [{{"name": "BS.ClassName", "extends": "EnsLib.SOAP.Service"}}],
    "BP": [{{"name": "BP.ClassName", "extends": "Ens.BusinessProcess"}}],
    "BO": [{{"name": "BO.ClassName", "extends": "Ens.BusinessOperation"}}],
    "DTL": [{{"name": "DTL.ClassName", "extends": "Ens.DataTransformDTL"}}],
    "MSG": [{{"name": "MSG.ClassName", "extends": "Ens.Request"}}]
  }}
}}

IMPORTANT: Return ONLY a single JSON object. The proposed_iris_mapping MUST include all necessary IRIS classes.

Source files:

{''.join(content_parts)}""",
            }
        ]

        return await self.run(messages)

    async def analyze_mirth_channel(self, channel_xml: str) -> dict:
        """Analyze a Mirth Connect channel XML."""
        messages = [
            {
                "role": "user",
                "content": f"Analyze this Mirth Connect channel and produce a structured JSON inventory:\n\n```xml\n{channel_xml}\n```",
            }
        ]

        return await self.run(messages)

    async def analyze_image(self, image_data: bytes, media_type: str = "image/png") -> dict:
        """Analyze a diagram/screenshot using Claude Vision."""
        import base64

        b64_image = base64.standard_b64encode(image_data).decode("utf-8")

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Analyze this integration flow diagram. Extract all components, connections, protocols, ports, service names, and HL7 message types. Produce a structured JSON inventory.",
                    },
                ],
            }
        ]

        return await self.run(messages)

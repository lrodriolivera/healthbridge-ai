"""CodeGen Agent — Generates ObjectScript classes from analysis and mappings"""

from pathlib import Path

from src.config import settings

from .base_agent import BaseAgent

KNOWLEDGE_BASE = Path(__file__).parents[4] / "knowledge-base"


class CodeGenAgent(BaseAgent):
    """Generates ObjectScript (.cls) code for InterSystems IRIS/Ensemble
    based on component analysis, mappings, and domain knowledge."""

    def __init__(self, use_high_complexity_model: bool = False):
        model = settings.high_complexity_model if use_high_complexity_model else settings.default_model
        super().__init__(model=model, max_tokens=16384)
        self.system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        # Load ObjectScript rules from knowledge base
        rules_file = KNOWLEDGE_BASE / "objectscript-rules.md"
        rules = rules_file.read_text() if rules_file.exists() else ""

        return f"""You are an expert ObjectScript developer for InterSystems IRIS/Ensemble.
You generate production-ready .cls files for healthcare integration migrations.

{rules}

ADDITIONAL GENERATION RULES:
- Generate COMPLETE, compilable .cls files — no placeholders, no TODO comments in critical paths
- Every class must have proper package/namespace prefix
- Use Settings parameters for all configurable values (URLs, ports, timeouts)
- Follow the compilation dependency order: Framework → Messages → BO → BP → BS → Production
- Include proper error handling with Try/Catch in every method
- Log entry and exit of every business method with $$$LOGINFO
- For SOAP operations, use %Net.HttpRequest directly (not SendFormDataArray)
- For HL7 construction, use raw string concatenation with $CHAR(13) separators
- Set DocType AFTER ImportFromString, never before

OUTPUT FORMAT:
Return ONLY the complete .cls file content, no markdown fences, no explanations.
The first line must be the class definition (/// comment or Class statement)."""

    def _load_template(self, template_name: str) -> str:
        """Load a class template from the knowledge base."""
        template_file = KNOWLEDGE_BASE / "iris-class-patterns" / template_name
        if template_file.exists():
            return template_file.read_text()
        return ""

    async def generate_class(
        self,
        analysis: dict,
        mapping: dict,
        existing_classes: list[str] | None = None,
    ) -> dict:
        """Generate an ObjectScript class based on analysis and mapping."""
        # Build context with relevant template
        iris_layer = mapping.get("iris_layer", "BP")
        template_map = {
            "BS": "business-service.cls.template",
            "BP": "business-process.cls.template",
            "BO": "business-operation-soap.cls.template",
            "DTL": "dtl-transformation.cls.template",
            "MSG": "message-class.cls.template",
        }
        template = self._load_template(template_map.get(iris_layer, "business-process.cls.template"))

        # Load equivalence table
        equiv_file = KNOWLEDGE_BASE / "equivalence-tables" / "soa-to-iris.json"
        equivalences = equiv_file.read_text() if equiv_file.exists() else "{}"

        context_parts = [
            f"## Component Analysis\n```json\n{analysis}\n```",
            f"## Mapping\n```json\n{mapping}\n```",
            f"## Template for {iris_layer}\n```objectscript\n{template}\n```",
            f"## Equivalence Table\n```json\n{equivalences}\n```",
        ]

        if existing_classes:
            context_parts.append(
                f"## Existing classes in this project (for reference/consistency)\n"
                + "\n".join(f"- {c}" for c in existing_classes[:20])
            )

        messages = [
            {
                "role": "user",
                "content": f"Generate a complete ObjectScript .cls file for this mapping:\n\n{''.join(context_parts)}",
            }
        ]

        return await self.run(messages)

    async def generate_production(self, project_name: str, namespace: str, components: list[dict]) -> dict:
        """Generate a Production.cls file from all project components."""
        template = self._load_template("production.cls.template")

        messages = [
            {
                "role": "user",
                "content": f"""Generate a complete Production.cls for namespace '{namespace}'.

## Template
```objectscript
{template}
```

## Components to include
```json
{components}
```

Include proper Settings for each Item (ports, URLs, TargetConfigNames, timeouts).
Set all Items to Enabled="true" initially.""",
            }
        ]

        return await self.run(messages)

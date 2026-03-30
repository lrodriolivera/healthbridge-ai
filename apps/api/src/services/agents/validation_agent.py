"""Validation Agent — Validates generated ObjectScript code against critical rules"""

import re
import structlog

from .base_agent import BaseAgent

logger = structlog.get_logger()


class ValidationAgent(BaseAgent):
    """Validates generated ObjectScript (.cls) files against critical rules.
    Combines static regex checks with semantic Claude validation."""

    def __init__(self):
        super().__init__(max_tokens=4096)
        self.system_prompt = """You are an ObjectScript code reviewer specializing in InterSystems IRIS/Ensemble.
Review the provided code for correctness, security, and adherence to best practices.

Focus on:
1. Business logic correctness (does it match the intended behavior?)
2. Error handling completeness (Try/Catch, namespace restore)
3. HL7 message construction (raw strings, proper separators)
4. SOAP/HTTP patterns (direct %Net.HttpRequest, not SendFormDataArray)
5. Logging (entry/exit, error details)
6. Settings parameterization (no hardcoded URLs/ports)

Return a JSON object:
{
  "passed": true/false,
  "issues": [{"severity": "error|warning|info", "line": N, "message": "..."}],
  "suggestions": ["..."]
}"""

    def validate_static(self, code: str) -> list[dict]:
        """Run static validation checks (no Claude API call needed)."""
        issues = []
        lines = code.split("\n")

        in_try_block = False
        try_depth = 0

        for i, line in enumerate(lines, 1):
            stripped = line.strip()

            # Track Try/Catch blocks
            if re.match(r"^\s*Try\s*\{?\s*$", stripped, re.IGNORECASE):
                in_try_block = True
                try_depth += 1
            if re.match(r"^\s*Catch\b", stripped, re.IGNORECASE):
                in_try_block = False

            # Rule 1: Quit "value" inside Try
            if in_try_block and re.match(r'^\s*Quit\s+"', stripped, re.IGNORECASE):
                issues.append({
                    "severity": "error",
                    "line": i,
                    "rule": "no-quit-value-in-try",
                    "message": 'CRITICAL: Quit "value" inside Try block causes ERROR #1043. Use Set tResult = "value" then Quit outside Try.',
                })

            # Rule 2: Underscores in variable names (excluding concatenation)
            var_match = re.findall(r"\b(t[A-Z]\w*_\w+)\b", stripped)
            for var in var_match:
                if not re.search(r'_\s*"', stripped):  # Not concatenation context
                    issues.append({
                        "severity": "error",
                        "line": i,
                        "rule": "no-underscore-variables",
                        "message": f'Variable "{var}" contains underscore. In ObjectScript, _ is concatenation. Use camelCase.',
                    })

            # Rule 3: New $NAMESPACE inside Try
            if in_try_block and re.match(r"^\s*New\s+\$NAMESPACE", stripped, re.IGNORECASE):
                issues.append({
                    "severity": "error",
                    "line": i,
                    "rule": "no-new-namespace-in-try",
                    "message": "CRITICAL: New $NAMESPACE inside Try scopes to method level, never restores. Use Set tOrigNS = $NAMESPACE before Try.",
                })

            # Rule 4: SetValueAt for message building
            if re.search(r"\.SetValueAt\(", stripped):
                issues.append({
                    "severity": "warning",
                    "line": i,
                    "rule": "no-setvalueat",
                    "message": "SetValueAt may fail after DTL/reimport. Prefer raw string concatenation for HL7 message construction.",
                })

            # Rule 5: GetValueAt for non-MSH segments
            gva_match = re.search(r'\.GetValueAt\(\s*"(PID|PV1|PV2|EVN|OBR|OBX|ORC|NK1)', stripped)
            if gva_match:
                seg = gva_match.group(1)
                issues.append({
                    "severity": "warning",
                    "line": i,
                    "rule": "no-getvalueat-non-msh",
                    "message": f"GetValueAt for {seg} fails silently without EVN segment. Use RawParser instead. GetValueAt only for MSH.",
                })

            # Check: Missing Try/Catch in Method
            if re.match(r"^\s*Method\s+\w+", stripped) and "Abstract" not in stripped:
                # Look ahead for Try
                remaining = "\n".join(lines[i:min(i + 30, len(lines))])
                if "Try" not in remaining and "{" in remaining:
                    issues.append({
                        "severity": "warning",
                        "line": i,
                        "rule": "missing-try-catch",
                        "message": "Method lacks Try/Catch error handling.",
                    })

            # Check: Hardcoded URLs/IPs
            if re.search(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', stripped):
                issues.append({
                    "severity": "warning",
                    "line": i,
                    "rule": "hardcoded-url",
                    "message": "Hardcoded IP address found. Use Settings parameter for configurable URLs.",
                })

        return issues

    async def validate_semantic(self, code: str, analysis: dict | None = None) -> dict:
        """Run semantic validation using Claude."""
        context = ""
        if analysis:
            context = f"\n\n## Original component analysis (for logic comparison)\n```json\n{analysis}\n```"

        messages = [
            {
                "role": "user",
                "content": f"Review this ObjectScript class for correctness and best practices:{context}\n\n```objectscript\n{code}\n```",
            }
        ]

        return await self.run(messages)

    async def validate(self, code: str, analysis: dict | None = None) -> dict:
        """Full validation: static + semantic."""
        # Static checks first (fast, no API call)
        static_issues = self.validate_static(code)

        # If critical errors found, skip semantic (save API cost)
        has_errors = any(i["severity"] == "error" for i in static_issues)
        if has_errors:
            return {
                "passed": False,
                "issues": static_issues,
                "semantic_review": None,
                "message": "Critical static validation errors found. Fix before semantic review.",
            }

        # Semantic review with Claude
        semantic_result = await self.validate_semantic(code, analysis)

        all_issues = static_issues  # warnings from static + semantic findings

        has_warnings_only = all(i["severity"] != "error" for i in all_issues)

        return {
            "passed": has_warnings_only,
            "issues": all_issues,
            "semantic_review": semantic_result.get("content", ""),
        }

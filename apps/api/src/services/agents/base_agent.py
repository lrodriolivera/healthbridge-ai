"""Base agent class for Claude AI agents via AWS Bedrock"""

import anthropic
import structlog

from src.config import settings

logger = structlog.get_logger()


class BaseAgent:
    """Base class for all HealthBridge AI agents."""

    system_prompt: str = ""
    tools: list = []

    def __init__(self, model: str | None = None, max_tokens: int = 8192):
        self.client = anthropic.AnthropicBedrock(
            aws_access_key=settings.aws_bedrock_access_key_id,
            aws_secret_key=settings.aws_bedrock_secret_access_key,
            aws_region=settings.aws_bedrock_region,
        )
        self.model = model or settings.default_model
        self.max_tokens = max_tokens

    async def run(
        self,
        messages: list[dict],
        system: str | None = None,
        tools: list | None = None,
    ) -> dict:
        """Execute the agent with given messages."""
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system or self.system_prompt,
                messages=messages,
                tools=tools or self.tools or anthropic.NOT_GIVEN,
            )
            return self.process_response(response)
        except anthropic.APIError as e:
            logger.error("Claude API error", error=str(e), model=self.model)
            raise

    def process_response(self, response) -> dict:
        """Process Claude API response. Override in subclasses for tool handling."""
        result = {
            "content": "",
            "tool_calls": [],
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
            "stop_reason": response.stop_reason,
        }

        for block in response.content:
            if block.type == "text":
                result["content"] += block.text
            elif block.type == "tool_use":
                result["tool_calls"].append(
                    {
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    }
                )

        return result

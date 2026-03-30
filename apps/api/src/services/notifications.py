"""Webhook notification service — sends event notifications to configured URLs"""

import httpx
import structlog
from datetime import datetime, timezone

logger = structlog.get_logger()


class NotificationService:
    """Send webhook notifications for key platform events."""

    async def notify(
        self,
        webhook_url: str,
        event_type: str,
        payload: dict,
    ) -> bool:
        """Send a webhook notification. Returns True if successful."""
        if not webhook_url:
            return False

        body = {
            "event": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    webhook_url,
                    json=body,
                    headers={"Content-Type": "application/json", "User-Agent": "HealthBridge-AI/1.0"},
                )
                if response.status_code < 400:
                    logger.info("Webhook sent", event=event_type, url=webhook_url, status=response.status_code)
                    return True
                else:
                    logger.warning("Webhook failed", event=event_type, url=webhook_url, status=response.status_code)
                    return False
        except Exception as e:
            logger.error("Webhook error", event=event_type, url=webhook_url, error=str(e))
            return False

    async def notify_analysis_complete(self, webhook_url: str, project_name: str, components_count: int):
        return await self.notify(webhook_url, "analysis.complete", {
            "project": project_name,
            "components_discovered": components_count,
        })

    async def notify_deploy_complete(self, webhook_url: str, project_name: str, deployed: int, failed: int):
        return await self.notify(webhook_url, "deploy.complete", {
            "project": project_name,
            "deployed": deployed,
            "failed": failed,
            "status": "success" if failed == 0 else "partial",
        })

    async def notify_tests_complete(self, webhook_url: str, project_name: str, passed: int, failed: int, errors: int):
        return await self.notify(webhook_url, "tests.complete", {
            "project": project_name,
            "passed": passed,
            "failed": failed,
            "errors": errors,
        })

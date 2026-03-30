"""Shared retry configuration for Celery tasks"""

import structlog

logger = structlog.get_logger()

# Retry with exponential backoff: 30s, 60s, 120s
RETRY_BACKOFF = True
RETRY_BACKOFF_MAX = 300  # 5 minutes max
RETRY_JITTER = True


def task_failure_handler(self, exc, task_id, args, kwargs, einfo):
    """Log task failure with full context."""
    logger.error(
        "celery_task_failed",
        task_name=self.name,
        task_id=task_id,
        args=str(args)[:200],
        error_type=type(exc).__name__,
        error=str(exc)[:500],
    )


def task_retry_handler(self, exc, task_id, args, kwargs, einfo):
    """Log task retry."""
    logger.warning(
        "celery_task_retrying",
        task_name=self.name,
        task_id=task_id,
        retry_count=self.request.retries,
        max_retries=self.max_retries,
        error=str(exc)[:200],
    )


def task_success_handler(self, retval, task_id, args, kwargs):
    """Log task success."""
    logger.info(
        "celery_task_succeeded",
        task_name=self.name,
        task_id=task_id,
    )

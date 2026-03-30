"""Celery app configuration with retry and error handling"""

from celery import Celery
from celery.signals import task_failure, task_retry, task_success

from src.config import settings

celery_app = Celery(
    "healthbridge",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    result_expires=3600,
    # Retry defaults
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    # Rate limiting for Claude API
    task_default_rate_limit="10/m",
)

celery_app.autodiscover_tasks([
    "src.workers.analysis_tasks",
    "src.workers.codegen_tasks",
    "src.workers.deploy_tasks",
    "src.workers.testing_tasks",
])


# Global signal handlers for logging
@task_failure.connect
def on_task_failure(sender=None, task_id=None, exception=None, args=None, **kwargs):
    from src.workers.retry_config import task_failure_handler
    task_failure_handler(sender, exception, task_id, args, kwargs, None)


@task_retry.connect
def on_task_retry(sender=None, request=None, reason=None, **kwargs):
    import structlog
    structlog.get_logger().warning("celery_task_retry", task=sender.name if sender else "?", reason=str(reason)[:200])


@task_success.connect
def on_task_success(sender=None, result=None, **kwargs):
    import structlog
    structlog.get_logger().info("celery_task_success", task=sender.name if sender else "?")

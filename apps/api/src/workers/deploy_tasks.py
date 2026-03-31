"""Deploy Celery tasks — deploy generated classes to IRIS via Atelier API"""

import asyncio
import json
import uuid
from datetime import datetime, timezone

import structlog

from src.db import SyncSession
from src.models.generated_class import GeneratedClass
from src.models.iris_connection import IRISConnection
from src.models.mapping import Mapping
from src.models.project import Project
from src.services.agents.codegen_agent import CodeGenAgent
from src.services.iris.atelier_client import AtelierClient
from src.services.storage import get_storage
from src.workers import celery_app

logger = structlog.get_logger()

LAYER_ORDER = {"Utils": 0, "MSG": 1, "BO": 2, "BP": 3, "BS": 4, "DTL": 5, "Production": 6}


async def _deploy_project_async(
    project_id: str,
    tenant_id: str,
    connection_id: str,
    generate_production: bool,
):
    storage = get_storage()

    with SyncSession() as session:
        project = session.get(Project, uuid.UUID(project_id))
        conn = session.get(IRISConnection, uuid.UUID(connection_id))

        if not project or not conn:
            logger.error("Project or connection not found")
            return

        # Get validated classes with layer info
        classes = (
            session.query(GeneratedClass, Mapping.iris_layer)
            .join(Mapping, GeneratedClass.mapping_id == Mapping.id)
            .filter(
                GeneratedClass.project_id == uuid.UUID(project_id),
                GeneratedClass.tenant_id == uuid.UUID(tenant_id),
                GeneratedClass.validation_status == "passed",
            )
            .all()
        )

        if not classes:
            project.status = "deploy_failed"
            session.commit()
            return

        # Sort by dependency order
        sorted_classes = sorted(classes, key=lambda x: LAYER_ORDER.get(x[1] or "", 99))

        # Optionally generate Production.cls
        if generate_production:
            try:
                components = []
                for gc, layer in sorted_classes:
                    mapping = session.get(Mapping, gc.mapping_id)
                    components.append({
                        "class_name": gc.class_name,
                        "target_type": mapping.target_type if mapping else "Unknown",
                        "iris_layer": layer,
                        "settings": mapping.settings if mapping else {},
                    })

                codegen = CodeGenAgent()
                namespace = conn.namespace
                prod_result = await codegen.generate_production(
                    project.name, namespace, components
                )
                prod_code = prod_result.get("content", "")
                if prod_code:
                    prod_key = f"{tenant_id}/{project_id}/generated/{namespace}/Production.cls"
                    await storage.put_file(prod_key, prod_code.encode("utf-8"), "text/plain")
                    # Add Production.cls to deploy list
                    sorted_classes.append((type("Obj", (), {
                        "class_name": f"{namespace}.Production",
                        "s3_key": prod_key,
                        "deploy_status": {},
                        "id": None,
                    })(), "Production"))
            except Exception as e:
                logger.error("Production.cls generation failed", error=str(e))

        # Deploy via Atelier
        client = AtelierClient(
            base_url=conn.base_url,
            namespace=conn.namespace,
            username=conn.credentials.get("username", ""),
            password=conn.credentials.get("password", ""),
            ssl_verify=conn.ssl_verify,
        )

        deployed_count = 0
        failed_count = 0
        deploy_results = []

        for gc, layer in sorted_classes:
            try:
                content = await storage.get_file(gc.s3_key)
                code = content.decode("utf-8")

                result = await client.deploy_class(gc.class_name, code)

                deploy_info = {
                    "status": "deployed",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "iris_server": conn.name,
                    "namespace": conn.namespace,
                }
                deployed_count += 1

                logger.info("Deployed class", class_name=gc.class_name)

            except Exception as e:
                deploy_info = {
                    "status": "failed",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "error": str(e),
                }
                failed_count += 1
                logger.error("Deploy failed", class_name=gc.class_name, error=str(e))

            # Update deploy_status in DB (skip mock Production object)
            if gc.id and hasattr(gc, "__tablename__"):
                real_gc = session.get(GeneratedClass, gc.id)
                if real_gc:
                    real_gc.deploy_status = deploy_info
                    session.commit()

            deploy_results.append({
                "class_name": gc.class_name,
                "layer": layer,
                **deploy_info,
            })

        # Restart production if any deployed
        if deployed_count > 0:
            try:
                await client.update_production(conn.namespace.split("_")[0] if "_" in conn.namespace else conn.namespace)
                logger.info("Production restarted")
            except Exception as e:
                logger.warning("Production restart failed", error=str(e))

        # Update project status and history
        project.status = "deployed" if failed_count == 0 else "deploy_partial"
        history = project.metadata_.get("deploy_history", []) if project.metadata_ else []
        history.insert(0, {
            "deployed_at": datetime.now(timezone.utc).isoformat(),
            "iris_connection_name": conn.name,
            "namespace": conn.namespace,
            "total_classes": len(sorted_classes),
            "successful": deployed_count,
            "failed": failed_count,
            "status": "success" if failed_count == 0 else "partial",
        })
        project.metadata_["deploy_history"] = history[:20]  # Keep last 20
        session.commit()

        logger.info(
            "Deploy complete",
            project_id=project_id,
            deployed=deployed_count,
            failed=failed_count,
        )

        # Send webhook notification
        from src.models.tenant import Tenant
        tenant = session.get(Tenant, uuid.UUID(tenant_id))
        if tenant and tenant.settings:
            webhook_url = tenant.settings.get("webhook_url")
            if webhook_url and tenant.settings.get("notify_on_deploy", True):
                from src.services.notifications import NotificationService
                asyncio.run(NotificationService().notify_deploy_complete(
                    webhook_url, project.name, deployed_count, failed_count,
                ))


@celery_app.task(name="deploy_project", bind=True, max_retries=0)
def deploy_project_task(
    self,
    project_id: str,
    tenant_id: str,
    connection_id: str,
    generate_production: bool = True,
):
    try:
        asyncio.run(_deploy_project_async(project_id, tenant_id, connection_id, generate_production))
    except Exception as exc:
        logger.error("deploy_project_task failed", project_id=project_id, error=str(exc))
        with SyncSession() as session:
            project = session.get(Project, uuid.UUID(project_id))
            if project:
                project.status = "deploy_failed"
                session.commit()

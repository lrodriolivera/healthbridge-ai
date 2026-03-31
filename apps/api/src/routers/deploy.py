"""Deploy router — deploy generated classes to IRIS"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.generated_class import GeneratedClass
from src.models.iris_connection import IRISConnection
from src.models.mapping import Mapping
from src.models.project import Project
from src.models.tenant import Tenant
from src.models.user import User
from src.routers.deps import get_project_for_tenant
from src.schemas.deploy import (
    DeployClassItem,
    DeployHistoryResponse,
    DeployRequest,
    DeployStatusResponse,
    DryRunRequest,
    DryRunResponse,
)
from src.workers.deploy_tasks import deploy_project_task

# Deployment order by IRIS layer
LAYER_ORDER = {"Utils": 0, "MSG": 1, "BO": 2, "BP": 3, "BS": 4, "DTL": 5, "Production": 6}

router = APIRouter()


def _sort_classes_for_deploy(classes_with_layer: list[tuple]) -> list[tuple]:
    """Sort classes by dependency order."""
    return sorted(classes_with_layer, key=lambda x: LAYER_ORDER.get(x[1] or "", 99))


@router.post("/{project_id}/deploy")
async def deploy(
    body: DeployRequest,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.middleware.plan_enforcer import enforce_feature
    enforce_feature(tenant, "deploy")

    # Verify IRIS connection belongs to tenant
    conn_result = await db.execute(
        select(IRISConnection).where(
            IRISConnection.id == body.iris_connection_id,
            IRISConnection.tenant_id == tenant.id,
        )
    )
    conn = conn_result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="IRIS connection not found")

    # Check for validated classes
    result = await db.execute(
        select(GeneratedClass).where(
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
            GeneratedClass.validation_status == "passed",
        )
    )
    classes = result.scalars().all()
    if not classes:
        raise HTTPException(status_code=400, detail="No validated classes to deploy")

    task = deploy_project_task.delay(
        str(project.id),
        str(tenant.id),
        str(body.iris_connection_id),
        body.generate_production,
    )

    project.status = "deploying"
    project.metadata_["deploy_task_id"] = task.id
    await db.flush()

    return {"task_id": task.id, "status": "queued", "total_classes": len(classes)}


@router.post("/{project_id}/deploy/dry-run", response_model=DryRunResponse)
async def dry_run(
    body: DryRunRequest,
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    conn_result = await db.execute(
        select(IRISConnection).where(
            IRISConnection.id == body.iris_connection_id,
            IRISConnection.tenant_id == tenant.id,
        )
    )
    conn = conn_result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="IRIS connection not found")

    # Get validated classes with their mapping layer
    result = await db.execute(
        select(GeneratedClass, Mapping.iris_layer)
        .join(Mapping, GeneratedClass.mapping_id == Mapping.id)
        .where(
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
            GeneratedClass.validation_status == "passed",
        )
    )
    rows = result.all()

    sorted_items = _sort_classes_for_deploy(
        [(gc.class_name, layer, gc.validation_status) for gc, layer in rows]
    )

    deploy_classes = [
        DeployClassItem(
            class_name=name,
            iris_layer=layer,
            validation_status=vs,
            order=i + 1,
        )
        for i, (name, layer, vs) in enumerate(sorted_items)
    ]

    return DryRunResponse(
        classes=deploy_classes,
        total=len(deploy_classes),
        iris_connection_name=conn.name,
        namespace=conn.namespace,
    )


@router.get("/{project_id}/deploy/status", response_model=DeployStatusResponse)
async def deploy_status(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedClass).where(
            GeneratedClass.project_id == project.id,
            GeneratedClass.tenant_id == tenant.id,
        )
    )
    classes = result.scalars().all()

    deployed = sum(1 for c in classes if c.deploy_status.get("status") == "deployed")
    failed = sum(1 for c in classes if c.deploy_status.get("status") == "failed")
    results = [
        {"class_name": c.class_name, "deploy_status": c.deploy_status}
        for c in classes
        if c.deploy_status.get("status")
    ]

    task_id = project.metadata_.get("deploy_task_id") if project.metadata_ else None

    return DeployStatusResponse(
        project_id=project.id,
        status=project.status,
        task_id=task_id,
        total_classes=len(classes),
        deployed=deployed,
        failed=failed,
        results=results,
    )


@router.get("/{project_id}/deploy/history", response_model=DeployHistoryResponse)
async def deploy_history(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
):
    history = (project.metadata_ or {}).get("deploy_history", [])
    return DeployHistoryResponse(items=history)

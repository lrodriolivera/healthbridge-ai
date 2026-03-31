"""Dashboard analytics router — aggregated stats for the tenant"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.auth import get_current_user
from src.middleware.tenant import get_current_tenant
from src.models.generated_class import GeneratedClass
from src.models.mapping import Mapping
from src.models.project import Project
from src.models.source_component import SourceComponent
from src.models.tenant import Tenant
from src.models.test_result import TestResult
from src.models.test_case import TestCase
from src.models.user import User

router = APIRouter()


@router.get("")
async def get_dashboard(
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated dashboard stats for the current tenant."""
    tid = tenant.id

    projects = (await db.execute(select(func.count()).select_from(Project).where(Project.tenant_id == tid))).scalar_one()
    components = (await db.execute(select(func.count()).select_from(SourceComponent).where(SourceComponent.tenant_id == tid))).scalar_one()
    mappings = (await db.execute(select(func.count()).select_from(Mapping).where(Mapping.tenant_id == tid))).scalar_one()
    mappings_confirmed = (await db.execute(select(func.count()).select_from(Mapping).where(Mapping.tenant_id == tid, Mapping.confirmed_by.isnot(None)))).scalar_one()
    classes = (await db.execute(select(func.count()).select_from(GeneratedClass).where(GeneratedClass.tenant_id == tid))).scalar_one()
    classes_passed = (await db.execute(select(func.count()).select_from(GeneratedClass).where(GeneratedClass.tenant_id == tid, GeneratedClass.validation_status == "passed"))).scalar_one()
    tests = (await db.execute(select(func.count()).select_from(TestResult).where(TestResult.tenant_id == tid))).scalar_one()
    tests_passed = (await db.execute(select(func.count()).select_from(TestResult).where(TestResult.tenant_id == tid, TestResult.status == "pass"))).scalar_one()
    users = (await db.execute(select(func.count()).select_from(User).where(User.tenant_id == tid))).scalar_one()

    # Project breakdown by status
    project_statuses = {}
    rows = await db.execute(select(Project.status, func.count()).where(Project.tenant_id == tid).group_by(Project.status))
    for status, count in rows.all():
        project_statuses[status] = count

    # Complexity breakdown
    complexity_dist = {}
    rows = await db.execute(select(SourceComponent.complexity, func.count()).where(SourceComponent.tenant_id == tid).group_by(SourceComponent.complexity))
    for complexity, count in rows.all():
        complexity_dist[complexity or "unknown"] = count

    return {
        "tenant": {"name": tenant.name, "plan": tenant.plan, "is_active": tenant.is_active},
        "stats": {
            "projects": projects,
            "components": components,
            "mappings": mappings,
            "mappings_confirmed": mappings_confirmed,
            "classes_generated": classes,
            "classes_passed": classes_passed,
            "tests_run": tests,
            "tests_passed": tests_passed,
            "users": users,
        },
        "pipeline_completion": {
            "upload": projects > 0,
            "analysis": components > 0,
            "mapping": mappings > 0,
            "codegen": classes > 0,
            "validation": classes_passed > 0,
            "testing": tests > 0,
        },
        "project_statuses": project_statuses,
        "complexity_distribution": complexity_dist,
    }

"""Export router — generate project documentation"""

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.middleware.tenant import get_current_tenant
from src.models.generated_class import GeneratedClass
from src.models.mapping import Mapping
from src.models.project import Project
from src.models.source_component import SourceComponent
from src.models.tenant import Tenant
from src.models.test_case import TestCase
from src.models.test_result import TestResult
from src.routers.deps import get_project_for_tenant
from src.services.doc_exporter import export_project_documentation, export_project_summary

router = APIRouter()


async def _load_project_data(project, tenant, db):
    """Load all project data for export."""
    components = (await db.execute(
        select(SourceComponent).where(SourceComponent.project_id == project.id, SourceComponent.tenant_id == tenant.id)
    )).scalars().all()

    mappings = (await db.execute(
        select(Mapping).where(Mapping.project_id == project.id, Mapping.tenant_id == tenant.id)
    )).scalars().all()

    generated = (await db.execute(
        select(GeneratedClass).where(GeneratedClass.project_id == project.id, GeneratedClass.tenant_id == tenant.id)
    )).scalars().all()

    tc_ids = [r[0] for r in (await db.execute(
        select(TestCase.id).where(TestCase.project_id == project.id, TestCase.tenant_id == tenant.id)
    )).all()]

    test_results = []
    if tc_ids:
        test_results = (await db.execute(
            select(TestResult).where(TestResult.test_case_id.in_(tc_ids), TestResult.tenant_id == tenant.id)
        )).scalars().all()

    return components, mappings, generated, test_results


@router.get("/{project_id}/export/documentation")
async def export_documentation(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    components, mappings, generated, test_results = await _load_project_data(project, tenant, db)

    markdown = export_project_documentation(project, components, mappings, generated, test_results)
    filename = f"{project.name.replace(' ', '_')}_DOCUMENTATION.md"

    return Response(
        content=markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{project_id}/export/summary")
async def export_summary_json(
    project: Project = Depends(get_project_for_tenant),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    components, mappings, generated, test_results = await _load_project_data(project, tenant, db)
    return export_project_summary(project, components, mappings, generated, test_results)

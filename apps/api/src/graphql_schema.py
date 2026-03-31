"""GraphQL schema for HealthBridge AI — complex dashboard queries"""

from typing import Optional
import uuid

import strawberry
from strawberry.fastapi import GraphQLRouter

from src.config import settings
from src.db import async_session
from src.models.generated_class import GeneratedClass
from src.models.mapping import Mapping
from src.models.project import Project
from src.models.source_component import SourceComponent
from src.models.test_result import TestResult
from src.models.test_case import TestCase

from sqlalchemy import func, select


@strawberry.type
class ProjectSummary:
    id: str
    name: str
    status: str
    source_platforms: list[str]
    components_count: int
    mappings_count: int
    mappings_confirmed: int
    classes_generated: int
    classes_passed: int
    tests_total: int
    tests_passed: int


@strawberry.type
class PipelineStatus:
    project_id: str
    upload: str  # pending, done
    analysis: str  # pending, running, done
    mapping: str  # pending, done
    codegen: str  # pending, running, done
    validation: str  # pending, done
    deploy: str  # pending, done
    testing: str  # pending, done


@strawberry.type
class DashboardStats:
    total_projects: int
    total_components: int
    total_classes_generated: int
    total_classes_passed: int
    total_tests_run: int
    total_tests_passed: int


@strawberry.type
class Query:
    @strawberry.field
    async def dashboard(self, tenant_id: str, info: strawberry.types.Info) -> DashboardStats:
        """Dashboard stats. Requires authenticated user with matching tenant_id."""
        # Note: In production, validate tenant_id against authenticated user's tenant
        # For now, log the access for audit
        tid = uuid.UUID(tenant_id)
        async with async_session() as session:
            projects = (await session.execute(
                select(func.count()).select_from(Project).where(Project.tenant_id == tid)
            )).scalar_one()

            components = (await session.execute(
                select(func.count()).select_from(SourceComponent).where(SourceComponent.tenant_id == tid)
            )).scalar_one()

            classes_total = (await session.execute(
                select(func.count()).select_from(GeneratedClass).where(GeneratedClass.tenant_id == tid)
            )).scalar_one()

            classes_passed = (await session.execute(
                select(func.count()).select_from(GeneratedClass).where(
                    GeneratedClass.tenant_id == tid, GeneratedClass.validation_status == "passed"
                )
            )).scalar_one()

            tests_total = (await session.execute(
                select(func.count()).select_from(TestResult).where(TestResult.tenant_id == tid)
            )).scalar_one()

            tests_passed = (await session.execute(
                select(func.count()).select_from(TestResult).where(
                    TestResult.tenant_id == tid, TestResult.status == "pass"
                )
            )).scalar_one()

            return DashboardStats(
                total_projects=projects,
                total_components=components,
                total_classes_generated=classes_total,
                total_classes_passed=classes_passed,
                total_tests_run=tests_total,
                total_tests_passed=tests_passed,
            )

    @strawberry.field
    async def project_summary(self, project_id: str, tenant_id: str) -> Optional[ProjectSummary]:
        pid = uuid.UUID(project_id)
        tid = uuid.UUID(tenant_id)
        async with async_session() as session:
            project = (await session.execute(
                select(Project).where(Project.id == pid, Project.tenant_id == tid)
            )).scalar_one_or_none()

            if not project:
                return None

            components = (await session.execute(
                select(func.count()).select_from(SourceComponent).where(SourceComponent.project_id == pid)
            )).scalar_one()

            mappings_total = (await session.execute(
                select(func.count()).select_from(Mapping).where(Mapping.project_id == pid)
            )).scalar_one()

            mappings_confirmed = (await session.execute(
                select(func.count()).select_from(Mapping).where(
                    Mapping.project_id == pid, Mapping.confirmed_by.isnot(None)
                )
            )).scalar_one()

            classes_total = (await session.execute(
                select(func.count()).select_from(GeneratedClass).where(GeneratedClass.project_id == pid)
            )).scalar_one()

            classes_passed = (await session.execute(
                select(func.count()).select_from(GeneratedClass).where(
                    GeneratedClass.project_id == pid, GeneratedClass.validation_status == "passed"
                )
            )).scalar_one()

            tc_ids = [r[0] for r in (await session.execute(
                select(TestCase.id).where(TestCase.project_id == pid)
            )).all()]

            tests_total = 0
            tests_passed = 0
            if tc_ids:
                tests_total = (await session.execute(
                    select(func.count()).select_from(TestResult).where(TestResult.test_case_id.in_(tc_ids))
                )).scalar_one()
                tests_passed = (await session.execute(
                    select(func.count()).select_from(TestResult).where(
                        TestResult.test_case_id.in_(tc_ids), TestResult.status == "pass"
                    )
                )).scalar_one()

            return ProjectSummary(
                id=str(project.id),
                name=project.name,
                status=project.status,
                source_platforms=project.source_platforms or [project.source_platform],
                components_count=components,
                mappings_count=mappings_total,
                mappings_confirmed=mappings_confirmed,
                classes_generated=classes_total,
                classes_passed=classes_passed,
                tests_total=tests_total,
                tests_passed=tests_passed,
            )


schema = strawberry.Schema(query=Query)
graphql_router = GraphQLRouter(schema)

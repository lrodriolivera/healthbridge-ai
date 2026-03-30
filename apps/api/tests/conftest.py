"""Shared test fixtures"""

import os
import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Set test environment before importing app
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5434/healthbridge_test"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing"
os.environ["STORAGE_BACKEND"] = "local"
os.environ["UPLOAD_DIR"] = "/tmp/healthbridge-test-uploads"

from src.db import get_db
from src.main import app
from src.models import Base
from src.models.tenant import Tenant
from src.models.user import User
from src.utils.security import create_access_token, get_password_hash

TEST_DB_URL = os.environ["DATABASE_URL"]

# Use NullPool to avoid connection reuse issues between tests
test_engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
TestSessionFactory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def _override_get_db():
    async with TestSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture(autouse=True)
async def clean_db():
    """Truncate all tables before each test."""
    async with test_engine.connect() as conn:
        await conn.execute(text(
            "TRUNCATE TABLE audit_logs, test_results, test_cases, "
            "generated_classes, mappings, source_components, "
            "iris_connections, projects, users, tenants CASCADE"
        ))
        await conn.commit()
    yield


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionFactory() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def tenant_and_user(db: AsyncSession) -> tuple[Tenant, User, str]:
    """Create a test tenant + admin user and return (tenant, user, token)."""
    tenant = Tenant(name="Test Org", slug=f"test-org-{uuid.uuid4().hex[:6]}")
    db.add(tenant)
    await db.flush()

    user = User(
        tenant_id=tenant.id,
        email=f"test-{uuid.uuid4().hex[:6]}@test.com",
        password_hash=get_password_hash("testpass123"),
        role="admin",
    )
    db.add(user)
    await db.flush()
    await db.commit()

    token = create_access_token({
        "sub": str(user.id),
        "tenant_id": str(tenant.id),
        "role": "admin",
    })

    return tenant, user, token


@pytest_asyncio.fixture
async def auth_headers(tenant_and_user) -> dict:
    """Return Authorization headers for authenticated requests."""
    _, _, token = tenant_and_user
    return {"Authorization": f"Bearer {token}"}

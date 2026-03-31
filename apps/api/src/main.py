"""HealthBridge AI — Backend API"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text as sa_text

from src.db import engine
from src.middleware.audit_logger import AuditLoggerMiddleware
from src.middleware.request_context import RequestContextMiddleware
from src.middleware.security_headers import SecurityHeadersMiddleware
from src.routers import analysis, audit, auth, codegen, deploy, export, field_mappings, iris_connections, lookup_tables, mappings, projects, settings, templates, testing, uploads


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="HealthBridge AI",
    description="""
## Healthcare Integration Migration Platform

HealthBridge AI automates migrations from **Mirth Connect, Oracle SOA/OSB, Rhapsody, BizTalk**
to **InterSystems IRIS/TrackCare** using Claude AI agents.

### Pipeline
`Upload → Analyze → Map → Generate ObjectScript → Validate → Deploy → Test`

### Authentication
All endpoints (except `/health`) require a **Bearer token** in the `Authorization` header.
Obtain a token via `POST /api/v1/auth/login`.

### Multi-Tenant
All data is isolated by tenant. Each user belongs to one tenant.
""",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
    openapi_tags=[
        {"name": "auth", "description": "Authentication: register, login, token refresh"},
        {"name": "projects", "description": "Migration project CRUD"},
        {"name": "uploads", "description": "File upload and management"},
        {"name": "analysis", "description": "AI-powered component analysis"},
        {"name": "mappings", "description": "Source → IRIS mapping management"},
        {"name": "codegen", "description": "ObjectScript code generation"},
        {"name": "iris", "description": "IRIS server connection management"},
        {"name": "deploy", "description": "Deploy generated code to IRIS"},
        {"name": "testing", "description": "Integration test execution (MLLP/HTTP/SOAP)"},
        {"name": "audit", "description": "Audit log viewer"},
        {"name": "export", "description": "Documentation and summary export"},
        {"name": "settings", "description": "Tenant and user settings"},
        {"name": "field-mappings", "description": "Detailed field-level mapping data"},
    ],
)

from src.config import settings as app_settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(AuditLoggerMiddleware)
app.add_middleware(RequestContextMiddleware)

# Phase 0 routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])

# Phase 1 routers
app.include_router(uploads.router, prefix="/api/v1/projects", tags=["uploads"])
app.include_router(analysis.router, prefix="/api/v1/projects", tags=["analysis"])

# Phase 2 routers
app.include_router(mappings.router, prefix="/api/v1/projects", tags=["mappings"])
app.include_router(codegen.router, prefix="/api/v1/projects", tags=["codegen"])
app.include_router(field_mappings.router, prefix="/api/v1/projects", tags=["field-mappings"])


# Phase 3 routers
app.include_router(iris_connections.router, prefix="/api/v1/iris-connections", tags=["iris"])
app.include_router(deploy.router, prefix="/api/v1/projects", tags=["deploy"])


# Phase 4 routers
app.include_router(testing.router, prefix="/api/v1/projects", tags=["testing"])

# Phase 5 routers
app.include_router(audit.router, prefix="/api/v1/audit-logs", tags=["audit"])
app.include_router(export.router, prefix="/api/v1/projects", tags=["export"])
app.include_router(settings.router, prefix="/api/v1/settings", tags=["settings"])
app.include_router(lookup_tables.router, prefix="/api/v1/projects", tags=["lookup-tables"])
app.include_router(templates.router, prefix="/api/v1/templates", tags=["templates"])

# GraphQL
from src.graphql_schema import graphql_router
app.include_router(graphql_router, prefix="/graphql")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "healthbridge-ai", "environment": app_settings.environment}


@app.get("/health/ready")
async def readiness_check():
    """Deep health check — verifies DB, Redis, and reports status."""
    checks = {}

    # Database
    try:
        from src.db import engine
        async with engine.connect() as conn:
            await conn.execute(sa_text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    # Redis
    try:
        import redis as redis_lib
        r = redis_lib.from_url(app_settings.redis_url, socket_timeout=3)
        r.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={"status": "ok" if all_ok else "degraded", "checks": checks, "service": "healthbridge-ai"},
    )

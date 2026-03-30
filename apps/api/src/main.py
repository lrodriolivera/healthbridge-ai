"""HealthBridge AI — Backend API"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text as sa_text

from src.db import engine
from src.middleware.request_context import RequestContextMiddleware
from src.routers import analysis, audit, auth, codegen, deploy, export, field_mappings, iris_connections, mappings, projects, settings, testing, uploads


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="HealthBridge AI",
    description="Platform for automating healthcare integration migrations to IRIS/TrackCare",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

from src.config import settings as app_settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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
    except Exception as e:
        checks["database"] = f"error: {str(e)[:100]}"

    # Redis
    try:
        import redis as redis_lib
        r = redis_lib.from_url(app_settings.redis_url, socket_timeout=3)
        r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {str(e)[:100]}"

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={"status": "ok" if all_ok else "degraded", "checks": checks, "service": "healthbridge-ai"},
    )

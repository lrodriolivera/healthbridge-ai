"""HealthBridge AI — Backend API"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.db import engine
from src.routers import analysis, auth, codegen, deploy, iris_connections, mappings, projects, testing, uploads


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="HealthBridge AI",
    description="Platform for automating healthcare integration migrations to IRIS/TrackCare",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 0 routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])

# Phase 1 routers
app.include_router(uploads.router, prefix="/api/v1/projects", tags=["uploads"])
app.include_router(analysis.router, prefix="/api/v1/projects", tags=["analysis"])

# Phase 2 routers
app.include_router(mappings.router, prefix="/api/v1/projects", tags=["mappings"])
app.include_router(codegen.router, prefix="/api/v1/projects", tags=["codegen"])


# Phase 3 routers
app.include_router(iris_connections.router, prefix="/api/v1/iris-connections", tags=["iris"])
app.include_router(deploy.router, prefix="/api/v1/projects", tags=["deploy"])


# Phase 4 routers
app.include_router(testing.router, prefix="/api/v1/projects", tags=["testing"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "healthbridge-ai"}

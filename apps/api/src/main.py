"""HealthBridge AI — Backend API"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="HealthBridge AI",
    description="Platform for automating healthcare integration migrations to IRIS/TrackCare",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "healthbridge-ai"}


# TODO Phase 0: Add routers
# from src.routers import auth, projects, uploads, analysis, mappings, codegen, deploy, testing, iris_connections
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
# app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
# app.include_router(uploads.router, prefix="/api/v1/projects", tags=["uploads"])
# app.include_router(analysis.router, prefix="/api/v1/projects", tags=["analysis"])
# app.include_router(mappings.router, prefix="/api/v1/projects", tags=["mappings"])
# app.include_router(codegen.router, prefix="/api/v1/projects", tags=["codegen"])
# app.include_router(deploy.router, prefix="/api/v1/projects", tags=["deploy"])
# app.include_router(testing.router, prefix="/api/v1/projects", tags=["testing"])
# app.include_router(iris_connections.router, prefix="/api/v1/iris-connections", tags=["iris"])

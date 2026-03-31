"""Automatic audit logging middleware — captures all state-changing API calls"""

import uuid
from datetime import datetime, timezone

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from src.utils.security import decode_access_token

logger = structlog.get_logger()

# Methods that change state and should be audited
AUDITED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

# Paths to always audit (even GET)
SENSITIVE_PATHS = {
    "/api/v1/iris-connections",
    "/api/v1/settings",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
}


class AuditLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Only audit state-changing requests or sensitive paths
        should_audit = (
            request.method in AUDITED_METHODS
            or any(request.url.path.startswith(p) for p in SENSITIVE_PATHS)
        )

        if not should_audit:
            return response

        # Extract user info from token
        user_id = None
        tenant_id = None
        token = None

        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        elif hasattr(request, "cookies"):
            token = request.cookies.get("auth_token")

        if token:
            payload = decode_access_token(token)
            if payload:
                user_id = payload.get("sub")
                tenant_id = payload.get("tenant_id")

        # Extract client IP
        forwarded = request.headers.get("x-forwarded-for")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")

        # Determine action and resource from path
        path = request.url.path
        action = request.method.lower()
        resource_type = _extract_resource_type(path)

        # Log the audit entry
        logger.info(
            "audit_event",
            action=action,
            resource_type=resource_type,
            path=path,
            status_code=response.status_code,
            user_id=user_id,
            tenant_id=tenant_id,
            ip_address=ip,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

        # Write to database asynchronously (best effort)
        if tenant_id and response.status_code < 500:
            try:
                from src.db import SyncSession
                from src.models.audit_log import AuditLog

                with SyncSession() as session:
                    entry = AuditLog(
                        tenant_id=uuid.UUID(tenant_id),
                        user_id=uuid.UUID(user_id) if user_id else None,
                        action=f"{action}:{resource_type}",
                        resource_type=resource_type,
                        details={"path": path, "status": response.status_code, "method": request.method},
                        ip_address=ip,
                    )
                    session.add(entry)
                    session.commit()
            except Exception:
                pass  # Don't fail request on audit failure

        return response


def _extract_resource_type(path: str) -> str:
    """Extract resource type from API path."""
    parts = path.strip("/").split("/")
    # /api/v1/projects/{id}/uploads → "uploads"
    # /api/v1/iris-connections → "iris-connections"
    # /api/v1/auth/login → "auth"
    if len(parts) >= 3:
        # Skip "api" and "v1"
        resource_parts = parts[2:]
        # Return the main resource name (skip UUIDs)
        for part in resource_parts:
            try:
                uuid.UUID(part)
                continue
            except ValueError:
                return part
    return "unknown"

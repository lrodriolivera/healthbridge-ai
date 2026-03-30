"""Settings schemas"""

from pydantic import BaseModel


class TenantSettings(BaseModel):
    # Organization
    organization_name: str | None = None

    # AI Models
    analysis_model: str | None = None  # Override default Opus 4.6
    codegen_model: str | None = None   # Override default Sonnet 4.6
    high_complexity_model: str | None = None  # Override for complex codegen

    # Notifications
    webhook_url: str | None = None
    notify_on_analysis: bool = True
    notify_on_deploy: bool = True
    notify_on_test: bool = True

    # IRIS Defaults
    default_namespace: str | None = None
    default_iris_connection_id: str | None = None

    # Data Retention
    auto_purge_uploads_days: int | None = None  # Auto-delete uploads after N days


class TenantSettingsResponse(BaseModel):
    settings: TenantSettings
    tenant_name: str
    tenant_slug: str


class UserProfileUpdate(BaseModel):
    email: str | None = None
    current_password: str | None = None
    new_password: str | None = None


class UserProfileResponse(BaseModel):
    id: str
    email: str
    role: str
    tenant_name: str

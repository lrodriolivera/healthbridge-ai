"""Application configuration"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "HealthBridge AI"
    debug: bool = False
    secret_key: str = ""  # REQUIRED: Set via SECRET_KEY env var
    environment: str = "development"  # development, staging, production

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.secret_key or self.secret_key == "change-me-in-production":
            if self.environment == "production":
                raise ValueError("SECRET_KEY must be set in production. Generate with: python -c \"import secrets; print(secrets.token_urlsafe(64))\"")
            # Auto-generate for development only
            import secrets
            self.secret_key = secrets.token_urlsafe(64)

    # CORS
    cors_allowed_origins: str = "http://localhost:3000"  # comma-separated

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/healthbridge"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # AWS — Infrastructure (S3, Secrets Manager, etc.)
    aws_region: str = "us-east-1"
    s3_bucket: str = "healthbridge-data"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # AWS Bedrock — Claude models
    aws_bedrock_region: str = "us-east-1"
    aws_bedrock_access_key_id: str = ""
    aws_bedrock_secret_access_key: str = ""

    # Claude models (Bedrock inference profile IDs)
    analysis_model: str = "us.anthropic.claude-opus-4-6-v1"
    default_model: str = "us.anthropic.claude-sonnet-4-6"
    high_complexity_model: str = "us.anthropic.claude-opus-4-6-v1"
    fast_model: str = "us.anthropic.claude-sonnet-4-6"

    # Storage
    storage_backend: str = "local"  # "local" or "s3"
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 100

    # Auth
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # Security
    login_rate_limit: int = 5  # max attempts per minute
    min_password_length: int = 8

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


settings = Settings()

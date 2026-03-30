"""Application configuration"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "HealthBridge AI"
    debug: bool = False
    secret_key: str = "change-me-in-production"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/healthbridge"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # AWS — Infrastructure (S3, Secrets Manager, etc.) — Account 367509577730
    aws_region: str = "us-east-1"
    s3_bucket: str = "healthbridge-data"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # AWS Bedrock — Claude models — Account 962990060849
    aws_bedrock_region: str = "us-east-1"
    aws_bedrock_access_key_id: str = ""
    aws_bedrock_secret_access_key: str = ""

    # Claude models (Bedrock model IDs)
    default_model: str = "anthropic.claude-sonnet-4-6"
    high_complexity_model: str = "anthropic.claude-opus-4-6-v1"
    fast_model: str = "anthropic.claude-haiku-4-5-20251001-v1:0"

    # Storage
    storage_backend: str = "local"  # "local" or "s3"
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 100

    # Auth
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60


settings = Settings()

"""Application configuration"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "HealthBridge AI"
    debug: bool = False
    secret_key: str = "change-me-in-production"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/healthbridge"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # AWS
    aws_region: str = "us-east-1"
    s3_bucket: str = "healthbridge-data"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # Anthropic
    anthropic_api_key: str = ""
    default_model: str = "claude-sonnet-4-20250514"
    high_complexity_model: str = "claude-opus-4-20250514"

    # Auth
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    class Config:
        env_file = ".env"


settings = Settings()

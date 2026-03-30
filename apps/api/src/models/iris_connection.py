"""IRISConnection model — connection to a customer's IRIS server"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class IRISConnection(Base):
    __tablename__ = "iris_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    namespace: Mapped[str] = mapped_column(String(100), nullable=False)
    # For dev: store credentials as JSONB {username, password}
    # For prod: migrate to credentials_secret_arn (AWS Secrets Manager)
    credentials: Mapped[dict] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb")
    )
    credentials_secret_arn: Mapped[str | None] = mapped_column(Text, nullable=True)
    ssl_verify: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    environment: Mapped[str] = mapped_column(String(50), server_default="dev")
    last_health_check: Mapped[datetime | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))

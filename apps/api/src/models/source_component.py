"""SourceComponent model — a discovered component from source platform"""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class SourceComponent(Base):
    __tablename__ = "source_components"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    component_type: Mapped[str] = mapped_column(String(100), nullable=False)
    source_file_s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    exposed_services: Mapped[list] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb")
    )
    external_references: Mapped[list] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb")
    )
    hl7_messages: Mapped[list] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb")
    )
    complexity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(50), server_default="discovered")
    created_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))

    project = relationship("Project", back_populates="source_components")

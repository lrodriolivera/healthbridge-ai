"""Mapping model — source component → IRIS target class mapping"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class Mapping(Base):
    __tablename__ = "mappings"

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
    source_component_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("source_components.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_class_name: Mapped[str] = mapped_column(String(500), nullable=False)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_extends: Mapped[str | None] = mapped_column(String(255), nullable=True)
    iris_layer: Mapped[str | None] = mapped_column(String(20), nullable=True)
    settings: Mapped[dict] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb")
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    auto_generated: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))

    project = relationship("Project", back_populates="mappings")
    source_component = relationship("SourceComponent")
    confirmed_user = relationship("User", foreign_keys=[confirmed_by])
    generated_classes = relationship("GeneratedClass", back_populates="mapping", cascade="all, delete-orphan")

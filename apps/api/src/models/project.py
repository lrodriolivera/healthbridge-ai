"""Project model — a migration project within a tenant"""

import uuid

from sqlalchemy import ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TenantMixin, TimestampMixin


class Project(TenantMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_platform: Mapped[str] = mapped_column(String(50), nullable=False)  # primary platform (backward compat)
    source_platforms: Mapped[list] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb")
    )
    target_platform: Mapped[str] = mapped_column(
        String(50), server_default="iris_healthconnect"
    )
    status: Mapped[str] = mapped_column(String(50), server_default="created")
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, server_default=text("'{}'::jsonb")
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    tenant = relationship("Tenant", back_populates="projects")
    creator = relationship("User", foreign_keys=[created_by])
    source_components = relationship("SourceComponent", back_populates="project", cascade="all, delete-orphan")
    mappings = relationship("Mapping", back_populates="project", cascade="all, delete-orphan")

"""TestCase model — a test case for validating deployed IRIS integrations"""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class TestCase(Base):
    __tablename__ = "test_cases"

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
    protocol: Mapped[str] = mapped_column(String(50), nullable=False)  # mllp, http, soap
    target_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    expected_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    hl7_message_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    tags: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))

    results = relationship("TestResult", back_populates="test_case", cascade="all, delete-orphan")

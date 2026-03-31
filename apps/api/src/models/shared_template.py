"""SharedTemplate model — reusable ObjectScript patterns across projects"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class SharedTemplate(Base):
    __tablename__ = "shared_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    iris_layer: Mapped[str] = mapped_column(String(20), nullable=False)  # BS, BP, BO, DTL, MSG
    template_type: Mapped[str] = mapped_column(String(50), nullable=False)  # mllp_service, soap_operation, etc.
    code: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    usage_count: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    is_public: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))  # visible to all tenants
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))

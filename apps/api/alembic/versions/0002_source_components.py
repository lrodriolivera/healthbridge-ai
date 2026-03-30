"""Add source_components table

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "source_components",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("component_type", sa.String(100), nullable=False),
        sa.Column("source_file_s3_key", sa.Text, nullable=True),
        sa.Column("analysis_result", postgresql.JSONB, nullable=True),
        sa.Column("exposed_services", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("external_references", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("hl7_messages", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("complexity", sa.String(20), nullable=True),
        sa.Column("status", sa.String(50), server_default="discovered"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("source_components")

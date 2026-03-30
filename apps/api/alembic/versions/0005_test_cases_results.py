"""Add test_cases and test_results tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "test_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("protocol", sa.String(50), nullable=False),
        sa.Column("target_host", sa.String(255), nullable=True),
        sa.Column("target_port", sa.Integer, nullable=True),
        sa.Column("message_content", sa.Text, nullable=False),
        sa.Column("expected_response", sa.Text, nullable=True),
        sa.Column("hl7_message_type", sa.String(20), nullable=True),
        sa.Column("tags", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "test_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("test_case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("iris_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("iris_connections.id"), nullable=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("response_content", sa.Text, nullable=True),
        sa.Column("response_time_ms", sa.Integer, nullable=True),
        sa.Column("ack_code", sa.String(10), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("executed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("test_results")
    op.drop_table("test_cases")

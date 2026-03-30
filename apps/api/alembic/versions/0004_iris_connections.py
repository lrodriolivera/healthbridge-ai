"""Add iris_connections table

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "iris_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=False),
        sa.Column("namespace", sa.String(100), nullable=False),
        sa.Column("credentials", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("credentials_secret_arn", sa.Text, nullable=True),
        sa.Column("ssl_verify", sa.Boolean, server_default=sa.text("true")),
        sa.Column("environment", sa.String(50), server_default="dev"),
        sa.Column("last_health_check", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("iris_connections")

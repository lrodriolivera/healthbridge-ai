"""Add shared_templates table

Revision ID: 0010
Revises: 0009
Create Date: 2026-03-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shared_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("iris_layer", sa.String(20), nullable=False),
        sa.Column("template_type", sa.String(50), nullable=False),
        sa.Column("code", sa.Text, nullable=False),
        sa.Column("tags", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("usage_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("is_public", sa.Boolean, server_default=sa.text("false")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.execute("ALTER TABLE shared_templates ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE shared_templates FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY shared_templates_tenant_isolation ON shared_templates
        USING (
            is_public = true OR
            tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id)
        )
    """)


def downgrade() -> None:
    op.drop_table("shared_templates")

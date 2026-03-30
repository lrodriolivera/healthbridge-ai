"""Add lookup_tables table

Revision ID: 0009
Revises: 0008
Create Date: 2026-03-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lookup_tables",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("entries", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    # RLS
    op.execute("ALTER TABLE lookup_tables ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE lookup_tables FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY lookup_tables_tenant_isolation ON lookup_tables
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)


def downgrade() -> None:
    op.drop_table("lookup_tables")

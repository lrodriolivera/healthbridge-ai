"""Add Row-Level Security policies for multi-tenant isolation

Revision ID: 0008
Revises: 0007
Create Date: 2026-03-30
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables with tenant_id that need RLS
TENANT_TABLES = [
    "users",
    "projects",
    "source_components",
    "mappings",
    "generated_classes",
    "iris_connections",
    "test_cases",
    "test_results",
    "audit_logs",
]


def upgrade() -> None:
    for table in TENANT_TABLES:
        # Enable RLS
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")

        # Create policy: rows visible only to matching tenant_id
        # Note: app must SET app.current_tenant_id before queries for RLS to work
        # For now, policies are permissive (allow all) when no tenant_id is set
        # This adds defense-in-depth on top of application-level filtering
        op.execute(f"""
            CREATE POLICY {table}_tenant_isolation ON {table}
            USING (
                tenant_id = COALESCE(
                    current_setting('app.current_tenant_id', true)::uuid,
                    tenant_id
                )
            )
        """)

    # Force RLS for table owners too (not just other roles)
    for table in TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS {table}_tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

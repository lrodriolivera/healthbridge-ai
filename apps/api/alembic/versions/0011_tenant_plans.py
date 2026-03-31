"""Add plan, is_active, trial_expires_at to tenants

Revision ID: 0011
Revises: 0010
Create Date: 2026-03-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("plan", sa.String(50), server_default="trial"))
    op.add_column("tenants", sa.Column("is_active", sa.Boolean, server_default=sa.text("true")))
    op.add_column("tenants", sa.Column("trial_expires_at", sa.DateTime(timezone=True), nullable=True))
    # Set existing tenants to enterprise (they're the admin)
    op.execute("UPDATE tenants SET plan = 'enterprise' WHERE plan = 'trial'")


def downgrade() -> None:
    op.drop_column("tenants", "trial_expires_at")
    op.drop_column("tenants", "is_active")
    op.drop_column("tenants", "plan")

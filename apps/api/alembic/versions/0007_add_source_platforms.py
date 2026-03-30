"""Add source_platforms JSONB array to projects

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("source_platforms", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")))
    # Backfill: copy source_platform into source_platforms array
    op.execute("UPDATE projects SET source_platforms = jsonb_build_array(source_platform) WHERE source_platforms = '[]'::jsonb")


def downgrade() -> None:
    op.drop_column("projects", "source_platforms")

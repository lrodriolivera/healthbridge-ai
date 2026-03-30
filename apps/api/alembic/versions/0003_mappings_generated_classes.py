"""Add mappings and generated_classes tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mappings",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("source_component_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("source_components.id", ondelete="SET NULL"), nullable=True),
        sa.Column("target_class_name", sa.String(500), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_extends", sa.String(255), nullable=True),
        sa.Column("iris_layer", sa.String(20), nullable=True),
        sa.Column("settings", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("auto_generated", sa.Boolean, server_default=sa.text("true")),
        sa.Column("confirmed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "generated_classes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("mapping_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("mappings.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("class_name", sa.String(500), nullable=False),
        sa.Column("s3_key", sa.Text, nullable=False),
        sa.Column("version", sa.Integer, server_default=sa.text("1")),
        sa.Column("content_hash", sa.String(64), nullable=True),
        sa.Column("generation_model", sa.String(100), nullable=True),
        sa.Column("generation_prompt_tokens", sa.Integer, nullable=True),
        sa.Column("generation_completion_tokens", sa.Integer, nullable=True),
        sa.Column("validation_status", sa.String(50), nullable=True),
        sa.Column("validation_issues", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("deploy_status", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("generated_classes")
    op.drop_table("mappings")

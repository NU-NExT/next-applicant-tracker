"""Profile snapshot and resume pointer fields.

Revision ID: 0005_profile_resume_fields
Revises: 0004_positions_question_schema
Create Date: 2026-03-12 00:30:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0005_profile_resume_fields"
down_revision = "0004_positions_question_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "application_submissions",
        sa.Column("profile_snapshot_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )
    op.add_column(
        "application_submissions",
        sa.Column("resume_s3_key", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("application_submissions", "resume_s3_key")
    op.drop_column("application_submissions", "profile_snapshot_json")

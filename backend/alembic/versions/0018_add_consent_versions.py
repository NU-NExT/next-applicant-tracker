"""0018_add_consent_versions

Add consent_versions table to store consent text and when it was added.

Revision ID: 0018_add_consent_versions
Revises: 0017_merge_0016_heads
Create Date: 2026-04-07 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0018_add_consent_versions"
down_revision = "0017_merge_0016_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "consent_versions",
        sa.Column("consent_version_id", sa.Integer(), primary_key=True, index=True, nullable=False),
        sa.Column("consent_text", sa.Text(), nullable=False),
        sa.Column("consent_version_created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("consent_versions")

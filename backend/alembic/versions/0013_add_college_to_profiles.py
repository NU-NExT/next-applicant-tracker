"""0013_add_college_to_profiles

Revision ID: 0013_add_college
Revises: 0012_hash_seed_pwds
Create Date: 2026-03-30 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0013_add_college"
down_revision = "0012_hash_seed_pwds"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("college", sa.String(128), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "college")

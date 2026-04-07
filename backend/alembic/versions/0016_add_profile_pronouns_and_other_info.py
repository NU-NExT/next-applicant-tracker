"""0016_add_profile_pronouns_and_other_info

Revision ID: 0016_profile_pronouns_info
Revises: 0015_seed_code_ids
Create Date: 2026-03-31 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0016_profile_pronouns_info"
down_revision = "0015_seed_code_ids"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("pronouns", sa.String(length=64), nullable=True))
    op.add_column("profiles", sa.Column("other_relevant_information", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "other_relevant_information")
    op.drop_column("profiles", "pronouns")

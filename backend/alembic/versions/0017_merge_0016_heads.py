"""0017_merge_0016_heads

Merge the two 0016 branches so `alembic upgrade head` has a single head.

Revision ID: 0017_merge_0016_heads
Revises: 0016_profile_pronouns_info, 0016_seed_questions
Create Date: 2026-04-02 00:00:00
"""

from __future__ import annotations

revision = "0017_merge_0016_heads"
down_revision = ("0016_profile_pronouns_info", "0016_seed_questions")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass


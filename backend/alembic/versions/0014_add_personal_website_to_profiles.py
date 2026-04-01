"""0014_add_personal_website_to_profiles

Revision ID: 0014_personal_website
Revises: 0013_add_college
Create Date: 2026-03-30 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0014_personal_website"
down_revision = "0013_add_college"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("personal_website_url", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "personal_website_url")

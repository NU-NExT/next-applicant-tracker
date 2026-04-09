"""0018_add_nuworks_and_nullable_date_end

Add nuworks_url and nuworks_position_id columns to job_listings.
Also alter listing_date_end to be nullable — the SRS does not require
an application deadline, and omitting it should not require a fake date.

Revision ID: 0018_add_nuworks_and_nullable_date_end
Revises: 0017_merge_0016_heads
Create Date: 2026-04-04 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0018_nuworks_fields"
down_revision = "0017_merge_0016_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("job_listings", sa.Column("nuworks_url", sa.String(512), nullable=True))
    op.add_column("job_listings", sa.Column("nuworks_position_id", sa.String(128), nullable=True))
    op.alter_column(
        "job_listings",
        "listing_date_end",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
    )


def downgrade() -> None:
    # NOTE: restoring NOT NULL requires no existing NULL rows
    op.alter_column(
        "job_listings",
        "listing_date_end",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
    op.drop_column("job_listings", "nuworks_position_id")
    op.drop_column("job_listings", "nuworks_url")

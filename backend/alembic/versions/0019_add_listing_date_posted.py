"""0019_add_listing_date_posted

Add listing_date_posted to job_listings so drafts/unposted roles can be
distinguished from publicly posted roles.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0019_add_listing_date_posted"
down_revision = "0018_nuworks_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("job_listings", sa.Column("listing_date_posted", sa.DateTime(timezone=True), nullable=True))
    op.create_index(
        "ix_job_listings_listing_date_posted",
        "job_listings",
        ["listing_date_posted"],
        unique=False,
    )
    op.execute(
        sa.text(
            """
            UPDATE job_listings
            SET listing_date_posted = listing_date_created
            WHERE listing_date_posted IS NULL
              AND is_active = TRUE
              AND listing_date_created <= CURRENT_TIMESTAMP
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_job_listings_listing_date_posted", table_name="job_listings")
    op.drop_column("job_listings", "listing_date_posted")

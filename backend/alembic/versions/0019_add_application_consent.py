"""0019_add_application_consent

Add application_consents table to record user consent per job application.

Revision ID: 0019_add_application_consent
Revises: 0018_add_consent_versions
Create Date: 2026-04-07 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0019_add_application_consent"
down_revision = "0018_add_consent_versions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "application_consents",
        sa.Column("application_consent_id", sa.Integer(), primary_key=True, index=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False, index=True),
        sa.Column("job_listing_id", sa.Integer(), sa.ForeignKey("job_listings.listing_id"), nullable=False, index=True),
        sa.Column("application_submission_id", sa.Integer(), sa.ForeignKey("application_submissions.application_submission_id"), nullable=True, index=True),
        sa.Column("consented_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consent_text", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_table("application_consents")

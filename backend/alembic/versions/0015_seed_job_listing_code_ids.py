"""0015_seed_job_listing_code_ids

Revision ID: 0015_seed_code_ids
Revises: 0014_personal_website
Create Date: 2026-03-30 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0015_seed_code_ids"
down_revision = "0014_personal_website"
branch_labels = None
depends_on = None

CODE_IDS = {
    "Standard SWE": "SE-001",
    "Data Platform Intern": "DP-001",
}


def upgrade() -> None:
    for job_name, code_id in CODE_IDS.items():
        op.execute(
            sa.text(
                "UPDATE job_listings SET code_id = :code_id WHERE job = :job_name AND (code_id IS NULL OR code_id = '')"
            ).bindparams(code_id=code_id, job_name=job_name)
        )


def downgrade() -> None:
    for job_name in CODE_IDS:
        op.execute(
            sa.text(
                "UPDATE job_listings SET code_id = NULL WHERE job = :job_name"
            ).bindparams(job_name=job_name)
        )

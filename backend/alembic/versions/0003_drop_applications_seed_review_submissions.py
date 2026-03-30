"""Drop legacy applications table and reseed review submissions.

Revision ID: 0003_drop_apps_seed_subs
Revises: 0002_seed_standard_swe_data
Create Date: 2026-03-09 00:00:00
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json

from alembic import op
import sqlalchemy as sa


revision = "0003_drop_apps_seed_subs"
down_revision = "0002_seed_standard_swe_data"
branch_labels = None
depends_on = None


def _review_submission_payload(name: str, idx: int) -> str:
    demographics_pool = [
        {"gender": "Woman", "ethnicity": "Asian", "disability": "No"},
        {"gender": "Man", "ethnicity": "White", "disability": "No"},
        {"gender": "Non-binary", "ethnicity": "Latino", "disability": "Yes"},
        {"gender": "Woman", "ethnicity": "Black", "disability": "No"},
        {"gender": "Man", "ethnicity": "Middle Eastern", "disability": "No"},
    ]
    demographics = demographics_pool[idx % len(demographics_pool)]
    email_local = "applicantx" if name == "Applicant X" else f"applicant{idx}"
    payload = {
        "demographics": {
            "email": f"{email_local}@northeastern.edu",
            **demographics,
        },
        "answers": [
            {
                "section": "introductory questions",
                "question": "Tell us about your relevant experience for this role.",
                "answer": "I have delivered full-stack features across backend APIs and frontend UX with strong ownership from planning through release.",
            },
            {
                "section": "role-specific questions/exp questions",
                "question": "Describe a project where you collaborated under deadlines.",
                "answer": "I worked in a five-person sprint team, aligned implementation details daily, and shipped on schedule with stable quality.",
            },
            {
                "section": "classes taken",
                "question": "Which courses best prepared you for this role?",
                "answer": "Software engineering, databases, and distributed systems coursework prepared me most for this role.",
            },
            {
                "section": "demographics",
                "question": "Do you require interview accommodations?",
                "answer": "No accommodations requested at this time.",
            },
        ],
    }
    return json.dumps(payload)


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc)

    op.execute(sa.text("DROP INDEX IF EXISTS ix_applications_id"))
    op.execute(sa.text("DROP TABLE IF EXISTS applications"))

    standard_swe_id = bind.execute(
        sa.text("SELECT id FROM job_listings WHERE job = :job ORDER BY id LIMIT 1"),
        {"job": "Standard SWE"},
    ).scalar_one_or_none()

    if standard_swe_id is None:
        standard_swe_id = bind.execute(
            sa.text(
                """
                INSERT INTO job_listings (date_created, date_end, job, description)
                VALUES (:date_created, :date_end, :job, :description)
                RETURNING id
                """
            ),
            {
                "date_created": now - timedelta(days=7),
                "date_end": now + timedelta(days=45),
                "job": "Standard SWE",
                "description": json.dumps(
                    [{"type": "paragraph", "content": "Standard SWE role description and expectations."}]
                ),
            },
        ).scalar_one()

    bind.execute(
        sa.text("DELETE FROM application_submissions WHERE job_listing_id = :job_listing_id"),
        {"job_listing_id": standard_swe_id},
    )

    names = ["Applicant X"] + [f"Applicant {idx}" for idx in range(1, 10)]
    insert_stmt = sa.text(
        """
        INSERT INTO application_submissions (
            job_listing_id, applicant_name, applicant_email, status, responses_json, created_at
        )
        VALUES (
            :job_listing_id, :applicant_name, :applicant_email, :status, :responses_json, :created_at
        )
        """
    )
    for idx, name in enumerate(names, start=1):
        bind.execute(
            insert_stmt,
            {
                "job_listing_id": standard_swe_id,
                "applicant_name": name,
                "applicant_email": f"applicant{idx}@northeastern.edu",
                "status": "submitted",
                "responses_json": _review_submission_payload(name, idx),
                "created_at": now - timedelta(days=idx),
            },
        )


def downgrade() -> None:
    bind = op.get_bind()
    standard_swe_id = bind.execute(
        sa.text("SELECT id FROM job_listings WHERE job = :job ORDER BY id LIMIT 1"),
        {"job": "Standard SWE"},
    ).scalar_one_or_none()

    if standard_swe_id is not None:
        bind.execute(
            sa.text(
                """
                DELETE FROM application_submissions
                WHERE job_listing_id = :job_listing_id
                  AND (applicant_name = 'Applicant X' OR applicant_name LIKE 'Applicant %')
                """
            ),
            {"job_listing_id": standard_swe_id},
        )

    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=128), nullable=False),
        sa.Column("description", sa.String(length=2048), nullable=False),
        sa.Column("resume_key", sa.String(length=128), nullable=True),
        sa.Column("transcript_key", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["job_metadata.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_applications_id"), "applications", ["id"], unique=False)

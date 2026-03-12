"""Candidate preseed data for mockup workflows.

Revision ID: 0007_candidate_preseed_data
Revises: 0006_review_consent_features
Create Date: 2026-03-12 02:30:00
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json

from alembic import op
import sqlalchemy as sa


revision = "0007_candidate_preseed_data"
down_revision = "0006_review_consent_features"
branch_labels = None
depends_on = None


def _answers_payload(index: int) -> str:
    return json.dumps(
        [
            {
                "question": "Describe a project where you collaborated with a team under deadlines.",
                "answer": f"I collaborated across frontend/backend tracks and delivered milestone {index}.",
                "is_global": False,
            },
            {
                "question": "What technical strengths are most relevant to this role?",
                "answer": "TypeScript, React, Python, SQL, and API design.",
                "is_global": False,
            },
            {
                "question": "How do you approach ambiguous requirements?",
                "answer": "I define assumptions, prototype quickly, and validate with stakeholders.",
                "is_global": False,
            },
        ]
    )


def _profile_snapshot(name: str, idx: int) -> str:
    return json.dumps(
        {
            "first_name": name.split(" ")[0],
            "last_name": name.split(" ")[-1] if " " in name else "Candidate",
            "user_metadata": {
                "global_profile": {
                    "Major(s) - selected from a maintained dropdown list": "Computer Science",
                    "Expected graduation date": f"202{6 + (idx % 2)}-05-01",
                    "Co-op number (1st, 2nd, 3rd, etc.)": str((idx % 3) + 1),
                    "Current year / grade level": "Junior" if idx % 2 == 0 else "Senior",
                    "College / school within Northeastern": "Khoury College of Computer Sciences",
                }
            },
        }
    )


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(timezone.utc)

    listing_id = bind.execute(
        sa.text(
            """
            SELECT id
            FROM job_listings
            WHERE position_title = 'Standard SWE' OR job = 'Standard SWE'
            ORDER BY id
            LIMIT 1
            """
        )
    ).scalar_one_or_none()

    if listing_id is None:
        listing_id = bind.execute(
            sa.text(
                """
                INSERT INTO job_listings (
                    date_created,
                    date_end,
                    position_title,
                    position_code,
                    job,
                    description,
                    required_skills,
                    target_start_date,
                    is_active,
                    candidate_intake_url
                ) VALUES (
                    :date_created,
                    :date_end,
                    :position_title,
                    :position_code,
                    :job,
                    :description,
                    :required_skills,
                    :target_start_date,
                    :is_active,
                    :candidate_intake_url
                )
                RETURNING id
                """
            ),
            {
                "date_created": now - timedelta(days=7),
                "date_end": now + timedelta(days=45),
                "position_title": "Standard SWE",
                "position_code": "POS-MOCK-0001",
                "job": "Standard SWE",
                "description": "Mock Standard SWE listing for UI workflows.",
                "required_skills": "React, TypeScript, Python",
                "target_start_date": now + timedelta(days=30),
                "is_active": True,
                "candidate_intake_url": "/apply?position=POS-MOCK-0001",
            },
        ).scalar_one()

    bind.execute(
        sa.text(
            """
            DELETE FROM application_review_comments
            WHERE application_submission_id IN (
                SELECT id FROM application_submissions
                WHERE applicant_email LIKE 'mockapplicant%@northeastern.edu'
            )
            """
        )
    )
    bind.execute(
        sa.text(
            """
            DELETE FROM application_review_scores
            WHERE application_submission_id IN (
                SELECT id FROM application_submissions
                WHERE applicant_email LIKE 'mockapplicant%@northeastern.edu'
            )
            """
        )
    )
    bind.execute(
        sa.text("DELETE FROM application_submissions WHERE applicant_email LIKE 'mockapplicant%@northeastern.edu'")
    )
    bind.execute(sa.text("DELETE FROM users WHERE email LIKE 'mockapplicant%@northeastern.edu'"))

    names = ["Applicant X"] + [f"Applicant {idx}" for idx in range(1, 10)]
    statuses = ["applied", "reviewed", "scored", "submitted"]
    for idx, name in enumerate(names):
        local = "mockapplicantx" if name == "Applicant X" else f"mockapplicant{idx}"
        email = f"{local}@northeastern.edu"
        bind.execute(
            sa.text(
                """
                INSERT INTO users (email, password, first_name, last_name, is_admin, is_active, user_metadata)
                VALUES (:email, :password, :first_name, :last_name, false, true, CAST(:user_metadata AS json))
                """
            ),
            {
                "email": email,
                "password": "<mock-seeded>",
                "first_name": name.split(" ")[0],
                "last_name": name.split(" ")[-1] if " " in name else "Candidate",
                "user_metadata": json.dumps({"auth_provider": "seed", "seeded": True}),
            },
        )

        bind.execute(
            sa.text(
                """
                INSERT INTO application_submissions (
                    job_listing_id,
                    applicant_name,
                    applicant_email,
                    status,
                    responses_json,
                    profile_snapshot_json,
                    created_at
                )
                VALUES (
                    :job_listing_id,
                    :applicant_name,
                    :applicant_email,
                    :status,
                    :responses_json,
                    CAST(:profile_snapshot_json AS json),
                    :created_at
                )
                """
            ),
            {
                "job_listing_id": listing_id,
                "applicant_name": name,
                "applicant_email": email,
                "status": statuses[idx % len(statuses)],
                "responses_json": _answers_payload(idx),
                "profile_snapshot_json": _profile_snapshot(name, idx),
                "created_at": now - timedelta(days=idx + 1),
            },
        )

    reviewer_id = bind.execute(
        sa.text(
            """
            SELECT id
            FROM users
            WHERE lower(coalesce(is_admin::text, '')) IN ('t', 'true', '1')
              AND lower(coalesce(is_active::text, '')) IN ('t', 'true', '1')
            ORDER BY id
            LIMIT 1
            """
        )
    ).scalar_one_or_none()

    if reviewer_id is not None:
        seeded_submissions = bind.execute(
            sa.text(
                """
                SELECT id
                FROM application_submissions
                WHERE applicant_email LIKE 'mockapplicant%@northeastern.edu'
                ORDER BY created_at DESC
                LIMIT 3
                """
            )
        ).fetchall()
        for row in seeded_submissions:
            submission_id = row[0]
            bind.execute(
                sa.text(
                    """
                    INSERT INTO application_review_scores (
                        application_submission_id, reviewer_user_id, score, created_at
                    ) VALUES (
                        :submission_id, :reviewer_id, :score, :created_at
                    )
                    """
                ),
                {
                    "submission_id": submission_id,
                    "reviewer_id": reviewer_id,
                    "score": 80,
                    "created_at": now,
                },
            )
            bind.execute(
                sa.text(
                    """
                    INSERT INTO application_review_comments (
                        application_submission_id, reviewer_user_id, comment, created_at
                    ) VALUES (
                        :submission_id, :reviewer_id, :comment, :created_at
                    )
                    """
                ),
                {
                    "submission_id": submission_id,
                    "reviewer_id": reviewer_id,
                    "comment": "Mock seeded reviewer note for UI walkthrough.",
                    "created_at": now,
                },
            )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            DELETE FROM application_review_comments
            WHERE application_submission_id IN (
                SELECT id FROM application_submissions
                WHERE applicant_email LIKE 'mockapplicant%@northeastern.edu'
            )
            """
        )
    )
    bind.execute(
        sa.text(
            """
            DELETE FROM application_review_scores
            WHERE application_submission_id IN (
                SELECT id FROM application_submissions
                WHERE applicant_email LIKE 'mockapplicant%@northeastern.edu'
            )
            """
        )
    )
    bind.execute(
        sa.text("DELETE FROM application_submissions WHERE applicant_email LIKE 'mockapplicant%@northeastern.edu'")
    )
    bind.execute(sa.text("DELETE FROM users WHERE email LIKE 'mockapplicant%@northeastern.edu'"))

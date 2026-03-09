"""Seed Standard SWE mock data

Revision ID: 0002_seed_standard_swe_data
Revises: 0001_initial_schema
Create Date: 2026-03-08 00:00:00
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json

from alembic import op
import sqlalchemy as sa


revision = "0002_seed_standard_swe_data"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    now = datetime(2026, 3, 8, 12, 0, tzinfo=timezone.utc)

    job_listings_table = sa.table(
        "job_listings",
        sa.column("id", sa.Integer),
        sa.column("date_created", sa.DateTime(timezone=True)),
        sa.column("date_end", sa.DateTime(timezone=True)),
        sa.column("job", sa.String),
        sa.column("description", sa.Text),
    )

    questions_table = sa.table(
        "questionnaire_questions",
        sa.column("id", sa.Integer),
        sa.column("job_listing_id", sa.Integer),
        sa.column("prompt", sa.String),
        sa.column("sort_order", sa.Integer),
    )

    submissions_table = sa.table(
        "application_submissions",
        sa.column("id", sa.Integer),
        sa.column("job_listing_id", sa.Integer),
        sa.column("applicant_name", sa.String),
        sa.column("applicant_email", sa.String),
        sa.column("status", sa.String),
        sa.column("responses_json", sa.Text),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )

    op.bulk_insert(
        job_listings_table,
        [
            {
                "id": 1,
                "date_created": now - timedelta(days=7),
                "date_end": now + timedelta(days=45),
                "job": "Standard SWE",
                "description": json.dumps(
                    [
                        {"type": "paragraph", "content": "Standard SWE role description and expectations."},
                        {"type": "paragraph", "content": "Use this as editable BlockNote starter content."},
                    ]
                ),
            },
            {
                "id": 2,
                "date_created": now + timedelta(days=14),
                "date_end": now + timedelta(days=90),
                "job": "Data Platform Intern",
                "description": json.dumps([{"type": "paragraph", "content": "Future listing placeholder."}]),
            },
        ],
    )

    prompts = [
        "Tell us about your relevant experience for this role.",
        "Why are you interested in NExT Consulting?",
        "Describe a project where you collaborated under deadlines.",
        "What technical strengths are most relevant to this role?",
        "How do you approach ambiguous requirements?",
        "Which classes best prepared you for this position?",
        "What coursework project best demonstrates your skills?",
        "What technical concepts are you currently learning?",
        "Please share any demographic information you are comfortable disclosing.",
        "Do you require interview accommodations?",
    ]

    op.bulk_insert(
        questions_table,
        [
            {
                "id": idx + 1,
                "job_listing_id": 1,
                "prompt": prompt,
                "sort_order": idx,
            }
            for idx, prompt in enumerate(prompts)
        ],
    )

    demographics_pool = [
        {"gender": "Woman", "ethnicity": "Asian", "disability": "No"},
        {"gender": "Man", "ethnicity": "White", "disability": "No"},
        {"gender": "Non-binary", "ethnicity": "Latino", "disability": "Yes"},
        {"gender": "Woman", "ethnicity": "Black", "disability": "No"},
        {"gender": "Man", "ethnicity": "Asian", "disability": "No"},
        {"gender": "Woman", "ethnicity": "White", "disability": "No"},
        {"gender": "Man", "ethnicity": "Middle Eastern", "disability": "No"},
        {"gender": "Woman", "ethnicity": "Latino", "disability": "Yes"},
        {"gender": "Non-binary", "ethnicity": "Black", "disability": "No"},
        {"gender": "Man", "ethnicity": "White", "disability": "No"},
    ]

    submissions = []
    for idx in range(10):
        demo = demographics_pool[idx]
        long_answers = [
            {
                "section": "introductory",
                "question": prompts[0],
                "answer": f"I am student applicant {idx + 1}, with project and co-op experience spanning backend APIs, frontend delivery, and team collaboration in fast-paced environments.",
            },
            {
                "section": "role-specific",
                "question": prompts[2],
                "answer": "In my capstone, I coordinated with four peers to ship a production-ready release in six weeks. I handled service design, sprint planning, and release QA.",
            },
            {
                "section": "classes taken",
                "question": prompts[5],
                "answer": "Courses including software engineering, database design, distributed systems, and human-centered computing have directly prepared me for this role.",
            },
            {
                "section": "demographics",
                "question": prompts[8],
                "answer": "Submitted in demographic section.",
            },
        ]
        payload = {
            "demographics": {
                "email": f"student{idx + 1}@northeastern.edu",
                **demo,
            },
            "answers": long_answers,
        }
        submissions.append(
            {
                "id": idx + 1,
                "job_listing_id": 1,
                "applicant_name": f"Student {idx + 1}",
                "applicant_email": f"student{idx + 1}@northeastern.edu",
                "status": "submitted",
                "responses_json": json.dumps(payload),
                "created_at": now - timedelta(days=idx),
            }
        )

    op.bulk_insert(submissions_table, submissions)


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM application_submissions WHERE job_listing_id IN (1, 2)"))
    op.execute(sa.text("DELETE FROM questionnaire_questions WHERE job_listing_id = 1"))
    op.execute(sa.text("DELETE FROM job_listings WHERE id IN (1, 2)"))

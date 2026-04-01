"""0016_seed_global_and_position_questions

Make job_listing_id nullable on questionnaire_questions so global questions
can exist without being tied to a specific listing.  Seed three global
questions (is_global=true, job_listing_id=NULL) and three position-specific
questions for job listing 2 (DP-001).

Revision ID: 0016_seed_questions
Revises: 0015_seed_code_ids
Create Date: 2026-03-30 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0016_seed_questions"
down_revision = "0015_seed_code_ids"
branch_labels = None
depends_on = None

GLOBAL_QUESTIONS = [
    {
        "prompt": "Why are you interested in NExT Co-op Consulting?",
        "sort_order": 1,
        "character_limit": 1000,
    },
    {
        "prompt": "Describe a challenging project you've worked on.",
        "sort_order": 2,
        "character_limit": 1500,
    },
    {
        "prompt": "What skills do you hope to develop during this co-op?",
        "sort_order": 3,
        "character_limit": 1000,
    },
]

POSITION_QUESTIONS = [
    {
        "prompt": "What experience do you have with data pipelines or ETL workflows?",
        "sort_order": 1,
        "character_limit": 1500,
    },
    {
        "prompt": "Describe your familiarity with SQL and any databases you have used.",
        "sort_order": 2,
        "character_limit": 1000,
    },
    {
        "prompt": "What interests you about the Data Platform Intern role specifically?",
        "sort_order": 3,
        "character_limit": 1000,
    },
]


def upgrade() -> None:
    # --- 1. Make job_listing_id nullable for global questions ---
    op.alter_column(
        "questionnaire_questions",
        "job_listing_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    bind = op.get_bind()

    # --- Reset the sequence so auto-increment won't collide with existing rows ---
    # The sequence name is based on the original column name "id" from 0001,
    # not the renamed "question_id" from 0011.
    bind.execute(
        sa.text(
            "SELECT setval(pg_get_serial_sequence('questionnaire_questions', 'question_id'), "
            "(SELECT COALESCE(MAX(question_id), 0) FROM questionnaire_questions))"
        )
    )

    # Look up the free_text question type id
    row = bind.execute(
        sa.text("SELECT question_type_id FROM question_types WHERE code = 'free_text'")
    ).fetchone()
    free_text_id = row[0] if row else 1

    # --- 2. Seed global questions (no job_listing_id) ---
    for q in GLOBAL_QUESTIONS:
        bind.execute(
            sa.text(
                """
                INSERT INTO questionnaire_questions
                    (job_listing_id, prompt, sort_order, question_type_id, character_limit, is_global,
                     question_created_at, question_updated_at)
                SELECT NULL, :prompt, :sort_order, :qt_id, :char_limit, TRUE,
                       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                WHERE NOT EXISTS (
                    SELECT 1 FROM questionnaire_questions
                    WHERE prompt = :prompt AND is_global = TRUE
                )
                """
            ),
            {
                "prompt": q["prompt"],
                "sort_order": q["sort_order"],
                "qt_id": free_text_id,
                "char_limit": q["character_limit"],
            },
        )

    # --- 3. Seed position-specific questions for job listing 2 (DP-001) ---
    # Find listing_id for DP-001
    listing_row = bind.execute(
        sa.text("SELECT listing_id FROM job_listings WHERE code_id = 'DP-001'")
    ).fetchone()
    if listing_row:
        dp_listing_id = listing_row[0]
        for q in POSITION_QUESTIONS:
            bind.execute(
                sa.text(
                    """
                    INSERT INTO questionnaire_questions
                        (job_listing_id, prompt, sort_order, question_type_id, character_limit, is_global,
                         question_created_at, question_updated_at)
                    SELECT :listing_id, :prompt, :sort_order, :qt_id, :char_limit, FALSE,
                           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    WHERE NOT EXISTS (
                        SELECT 1 FROM questionnaire_questions
                        WHERE prompt = :prompt AND job_listing_id = :listing_id
                    )
                    """
                ),
                {
                    "listing_id": dp_listing_id,
                    "prompt": q["prompt"],
                    "sort_order": q["sort_order"],
                    "qt_id": free_text_id,
                    "char_limit": q["character_limit"],
                },
            )


def downgrade() -> None:
    bind = op.get_bind()

    # Remove seeded position questions for DP-001
    listing_row = bind.execute(
        sa.text("SELECT listing_id FROM job_listings WHERE code_id = 'DP-001'")
    ).fetchone()
    if listing_row:
        for q in POSITION_QUESTIONS:
            bind.execute(
                sa.text(
                    "DELETE FROM questionnaire_questions WHERE prompt = :prompt AND job_listing_id = :listing_id"
                ),
                {"prompt": q["prompt"], "listing_id": listing_row[0]},
            )

    # Remove seeded global questions
    for q in GLOBAL_QUESTIONS:
        bind.execute(
            sa.text(
                "DELETE FROM questionnaire_questions WHERE prompt = :prompt AND is_global = TRUE"
            ),
            {"prompt": q["prompt"]},
        )

    # Restore NOT NULL on job_listing_id
    op.alter_column(
        "questionnaire_questions",
        "job_listing_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

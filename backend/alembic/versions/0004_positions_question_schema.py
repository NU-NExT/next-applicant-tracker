"""Positions, user metadata, and structured question schema.

Revision ID: 0004_positions_question_schema
Revises: 0003_drop_apps_seed_subs
Create Date: 2026-03-12 00:00:00
"""

from __future__ import annotations

from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


revision = "0004_positions_question_schema"
down_revision = "0003_drop_apps_seed_subs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("user_metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )

    op.add_column("job_listings", sa.Column("position_title", sa.String(length=128), nullable=True))
    op.add_column("job_listings", sa.Column("position_code", sa.String(length=64), nullable=True))
    op.add_column("job_listings", sa.Column("required_skills", sa.Text(), nullable=True))
    op.add_column("job_listings", sa.Column("target_start_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("job_listings", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("job_listings", sa.Column("candidate_intake_url", sa.String(length=255), nullable=True))

    op.add_column(
        "questionnaire_questions",
        sa.Column("question_type", sa.String(length=64), nullable=False, server_default="free_text"),
    )
    op.add_column("questionnaire_questions", sa.Column("character_limit", sa.Integer(), nullable=True))
    op.add_column("questionnaire_questions", sa.Column("question_bank_key", sa.String(length=128), nullable=True))
    op.add_column("questionnaire_questions", sa.Column("question_config_json", sa.JSON(), nullable=True))
    op.add_column(
        "questionnaire_questions",
        sa.Column("is_global", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "field_options",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("value", sa.String(length=128), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_field_options_id"), "field_options", ["id"], unique=False)
    op.create_index(op.f("ix_field_options_category"), "field_options", ["category"], unique=False)

    op.execute(sa.text("UPDATE job_listings SET position_title = job WHERE position_title IS NULL"))
    op.execute(
        sa.text(
            """
            UPDATE job_listings
            SET position_code = CONCAT('POS-', LPAD(id::text, 4, '0'))
            WHERE position_code IS NULL
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE job_listings
            SET candidate_intake_url = CONCAT('/apply?position=', position_code)
            WHERE candidate_intake_url IS NULL
            """
        )
    )
    op.alter_column("job_listings", "position_title", existing_type=sa.String(length=128), nullable=False)
    op.alter_column("job_listings", "position_code", existing_type=sa.String(length=64), nullable=False)
    op.alter_column("job_listings", "candidate_intake_url", existing_type=sa.String(length=255), nullable=False)
    op.create_index(op.f("ix_job_listings_position_code"), "job_listings", ["position_code"], unique=True)
    op.create_index(op.f("ix_job_listings_candidate_intake_url"), "job_listings", ["candidate_intake_url"], unique=True)

    now = datetime.now(timezone.utc)
    field_options_table = sa.table(
        "field_options",
        sa.column("category", sa.String),
        sa.column("value", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    seed_rows = [
        ("major", "Computer Science"),
        ("major", "Data Science"),
        ("major", "Computer Engineering"),
        ("minor", "Mathematics"),
        ("minor", "Business Administration"),
        ("minor", "Interaction Design"),
        ("concentration", "AI"),
        ("concentration", "Systems"),
        ("concentration", "Software"),
    ]
    op.bulk_insert(
        field_options_table,
        [
            {
                "category": category,
                "value": value,
                "sort_order": idx,
                "is_active": True,
                "created_at": now,
            }
            for idx, (category, value) in enumerate(seed_rows)
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_job_listings_candidate_intake_url"), table_name="job_listings")
    op.drop_index(op.f("ix_job_listings_position_code"), table_name="job_listings")
    op.drop_column("questionnaire_questions", "is_global")
    op.drop_column("questionnaire_questions", "question_config_json")
    op.drop_column("questionnaire_questions", "question_bank_key")
    op.drop_column("questionnaire_questions", "character_limit")
    op.drop_column("questionnaire_questions", "question_type")

    op.drop_column("job_listings", "candidate_intake_url")
    op.drop_column("job_listings", "is_active")
    op.drop_column("job_listings", "target_start_date")
    op.drop_column("job_listings", "required_skills")
    op.drop_column("job_listings", "position_code")
    op.drop_column("job_listings", "position_title")

    op.drop_index(op.f("ix_field_options_category"), table_name="field_options")
    op.drop_index(op.f("ix_field_options_id"), table_name="field_options")
    op.drop_table("field_options")

    op.drop_column("users", "user_metadata")

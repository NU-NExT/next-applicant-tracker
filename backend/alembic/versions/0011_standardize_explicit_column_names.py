"""0011_standardize_explicit_column_names

Revision ID: 0011_std_col_names
Revises: 0010_sync_models
Create Date: 2026-03-20 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0011_std_col_names"
down_revision = "0010_sync_models"
branch_labels = None
depends_on = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_exists(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _rename_column_if_needed(table_name: str, old_name: str, new_name: str) -> None:
    inspector = sa.inspect(op.get_bind())
    if not _table_exists(inspector, table_name):
        return
    if _column_exists(inspector, table_name, old_name) and not _column_exists(inspector, table_name, new_name):
        op.alter_column(table_name, old_name, new_column_name=new_name)


def _rename_many(table_name: str, pairs: list[tuple[str, str]]) -> None:
    for old_name, new_name in pairs:
        _rename_column_if_needed(table_name, old_name, new_name)


def upgrade() -> None:
    # Primary key / identity names
    _rename_many("job_metadata", [("id", "metadata_id")])
    _rename_many("job_listings", [("id", "listing_id")])
    _rename_many("questionnaire_questions", [("id", "question_id")])
    _rename_many("users", [("id", "user_id")])
    _rename_many("roles", [("id", "role_id")])
    _rename_many("profiles", [("id", "profile_id")])
    _rename_many("field_options", [("id", "field_option_id")])
    _rename_many("application_submissions", [("id", "application_submission_id")])
    _rename_many("application_review_scores", [("id", "application_review_score_id")])
    _rename_many("application_review_comments", [("id", "application_review_comment_id")])
    _rename_many("application_question_responses", [("id", "application_question_response_id")])
    _rename_many("job_listing_questions", [("id", "job_listing_question_id")])

    # Explicit timestamp names
    _rename_many(
        "job_metadata",
        [("created_at", "metadata_created_at"), ("updated_at", "metadata_updated_at")],
    )
    _rename_many(
        "job_listings",
        [
            ("date_created", "listing_date_created"),
            ("date_end", "listing_date_end"),
            ("slug", "listing_slug"),
            ("created_at", "listing_created_at"),
            ("updated_at", "listing_updated_at"),
        ],
    )
    _rename_many(
        "question_types",
        [("created_at", "question_type_created_at"), ("updated_at", "question_type_updated_at")],
    )
    _rename_many(
        "questionnaire_questions",
        [("created_at", "question_created_at"), ("updated_at", "question_updated_at")],
    )
    _rename_many(
        "users",
        [("created_at", "user_created_at"), ("updated_at", "user_updated_at")],
    )
    _rename_many(
        "roles",
        [("created_at", "role_created_at"), ("updated_at", "role_updated_at")],
    )
    _rename_many(
        "profiles",
        [("created_at", "profile_created_at"), ("updated_at", "profile_updated_at")],
    )
    _rename_many(
        "field_options",
        [("created_at", "field_option_created_at"), ("updated_at", "field_option_updated_at")],
    )
    _rename_many(
        "application_submissions",
        [
            ("created_at", "application_submission_created_at"),
            ("updated_at", "application_submission_updated_at"),
        ],
    )
    _rename_many(
        "application_statuses",
        [
            ("created_at", "application_status_created_at"),
            ("updated_at", "application_status_updated_at"),
        ],
    )
    _rename_many(
        "application_submission_status_events",
        [
            ("created_at", "application_submission_status_event_created_at"),
            ("updated_at", "application_submission_status_event_updated_at"),
        ],
    )
    _rename_many(
        "score_values",
        [("created_at", "score_value_created_at"), ("updated_at", "score_value_updated_at")],
    )
    _rename_many(
        "application_review_scores",
        [
            ("created_at", "application_review_score_created_at"),
            ("updated_at", "application_review_score_updated_at"),
        ],
    )
    _rename_many(
        "application_review_comments",
        [
            ("created_at", "application_review_comment_created_at"),
            ("updated_at", "application_review_comment_updated_at"),
        ],
    )
    _rename_many(
        "application_question_responses",
        [
            ("created_at", "application_question_response_created_at"),
            ("updated_at", "application_question_response_updated_at"),
        ],
    )
    _rename_many(
        "job_listing_questions",
        [("created_at", "job_listing_question_created_at"), ("updated_at", "job_listing_question_updated_at")],
    )


def downgrade() -> None:
    # Kept intentionally minimal to avoid reintroducing ambiguous names.
    pass

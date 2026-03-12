"""Consent, review scoring, and comment features.

Revision ID: 0006_review_consent_features
Revises: 0005_profile_resume_fields
Create Date: 2026-03-12 01:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0006_review_consent_features"
down_revision = "0005_profile_resume_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("consented_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "application_review_scores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_submission_id", sa.Integer(), nullable=False),
        sa.Column("reviewer_user_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["application_submission_id"], ["application_submissions.id"]),
        sa.ForeignKeyConstraint(["reviewer_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_application_review_scores_id"), "application_review_scores", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_application_review_scores_application_submission_id"),
        "application_review_scores",
        ["application_submission_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_application_review_scores_reviewer_user_id"),
        "application_review_scores",
        ["reviewer_user_id"],
        unique=False,
    )

    op.create_table(
        "application_review_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_submission_id", sa.Integer(), nullable=False),
        sa.Column("reviewer_user_id", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["application_submission_id"], ["application_submissions.id"]),
        sa.ForeignKeyConstraint(["reviewer_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_application_review_comments_id"), "application_review_comments", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_application_review_comments_application_submission_id"),
        "application_review_comments",
        ["application_submission_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_application_review_comments_reviewer_user_id"),
        "application_review_comments",
        ["reviewer_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_application_review_comments_reviewer_user_id"),
        table_name="application_review_comments",
    )
    op.drop_index(
        op.f("ix_application_review_comments_application_submission_id"),
        table_name="application_review_comments",
    )
    op.drop_index(op.f("ix_application_review_comments_id"), table_name="application_review_comments")
    op.drop_table("application_review_comments")

    op.drop_index(
        op.f("ix_application_review_scores_reviewer_user_id"),
        table_name="application_review_scores",
    )
    op.drop_index(
        op.f("ix_application_review_scores_application_submission_id"),
        table_name="application_review_scores",
    )
    op.drop_index(op.f("ix_application_review_scores_id"), table_name="application_review_scores")
    op.drop_table("application_review_scores")

    op.drop_column("users", "consented_at")
    op.drop_column("users", "is_active")

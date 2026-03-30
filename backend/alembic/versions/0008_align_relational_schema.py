"""Migration to align relational schema with Jack's given ATS schema diagram.

Revision ID: 0008_align_relational_schema
Revises: 0007_candidate_preseed_data
Create Date: 2026-03-17 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0008_align_relational_schema"
down_revision = "0007_candidate_preseed_data"
branch_labels = None
depends_on = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_exists(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _index_exists(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return index_name in {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector, "roles"):
        op.create_table(
            "roles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=64), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )
        op.create_index(op.f("ix_roles_id"), "roles", ["id"], unique=False)

    inspector = sa.inspect(bind)
    if not _column_exists(inspector, "users", "role_id"):
        op.add_column("users", sa.Column("role_id", sa.Integer(), nullable=True))
        op.create_foreign_key("fk_users_role_id_roles", "users", "roles", ["role_id"], ["id"])

    if not _table_exists(inspector, "profiles"):
        op.create_table(
            "profiles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("full_legal_name", sa.String(length=255), nullable=True),
            sa.Column("phone_number", sa.String(length=64), nullable=True),
            sa.Column("expected_graduation_date", sa.String(length=32), nullable=True),
            sa.Column("current_year", sa.String(length=64), nullable=True),
            sa.Column("coop_number", sa.String(length=32), nullable=True),
            sa.Column("major", sa.String(length=128), nullable=True),
            sa.Column("minor", sa.String(length=128), nullable=True),
            sa.Column("concentration", sa.String(length=128), nullable=True),
            sa.Column("gpa", sa.String(length=16), nullable=True),
            sa.Column("github_url", sa.String(length=255), nullable=True),
            sa.Column("linkedin_url", sa.String(length=255), nullable=True),
            sa.Column("club", sa.String(length=255), nullable=True),
            sa.Column("past_experience_count", sa.Integer(), nullable=True),
            sa.Column("unique_experience_count", sa.Integer(), nullable=True),
            sa.Column("resume_s3_key", sa.String(length=512), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id"),
        )
        op.create_index(op.f("ix_profiles_id"), "profiles", ["id"], unique=False)
        op.create_index(op.f("ix_profiles_user_id"), "profiles", ["user_id"], unique=True)

    inspector = sa.inspect(bind)
    if not _column_exists(inspector, "job_listings", "code_id"):
        op.add_column("job_listings", sa.Column("code_id", sa.String(length=64), nullable=True))
    if not _column_exists(inspector, "job_listings", "status"):
        op.add_column(
            "job_listings",
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        )
    if not _column_exists(inspector, "job_listings", "ats_questions_url"):
        op.add_column("job_listings", sa.Column("ats_questions_url", sa.String(length=512), nullable=True))

    if not _table_exists(inspector, "job_listing_questions"):
        op.create_table(
            "job_listing_questions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("job_listing_id", sa.Integer(), nullable=False),
            sa.Column("question_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["job_listing_id"], ["job_listings.id"]),
            sa.ForeignKeyConstraint(["question_id"], ["questionnaire_questions.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_job_listing_questions_id"), "job_listing_questions", ["id"], unique=False)
        op.create_index(
            op.f("ix_job_listing_questions_job_listing_id"),
            "job_listing_questions",
            ["job_listing_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_job_listing_questions_question_id"),
            "job_listing_questions",
            ["question_id"],
            unique=False,
        )

    inspector = sa.inspect(bind)
    if not _column_exists(inspector, "questionnaire_questions", "answer_type"):
        op.add_column(
            "questionnaire_questions",
            sa.Column("answer_type", sa.String(length=64), nullable=False, server_default="free_text"),
        )
    if not _column_exists(inspector, "questionnaire_questions", "answer_bank_key"):
        op.add_column("questionnaire_questions", sa.Column("answer_bank_key", sa.String(length=128), nullable=True))
    if not _column_exists(inspector, "questionnaire_questions", "answer_config_json"):
        op.add_column("questionnaire_questions", sa.Column("answer_config_json", sa.JSON(), nullable=True))

    if not _column_exists(inspector, "application_submissions", "user_id"):
        op.add_column("application_submissions", sa.Column("user_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_application_submissions_user_id_users",
            "application_submissions",
            "users",
            ["user_id"],
            ["id"],
        )
    inspector = sa.inspect(bind)
    if not _index_exists(inspector, "application_submissions", "ix_application_submissions_user_id"):
        op.create_index(
            op.f("ix_application_submissions_user_id"),
            "application_submissions",
            ["user_id"],
            unique=False,
        )

    if not _table_exists(inspector, "application_question_responses"):
        op.create_table(
            "application_question_responses",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("application_submission_id", sa.Integer(), nullable=False),
            sa.Column("question_id", sa.Integer(), nullable=False),
            sa.Column("response_text", sa.Text(), nullable=False),
            sa.ForeignKeyConstraint(["application_submission_id"], ["application_submissions.id"]),
            sa.ForeignKeyConstraint(["question_id"], ["questionnaire_questions.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_application_question_responses_id"),
            "application_question_responses",
            ["id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_application_question_responses_application_submission_id"),
            "application_question_responses",
            ["application_submission_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_application_question_responses_question_id"),
            "application_question_responses",
            ["question_id"],
            unique=False,
        )

    if not _table_exists(inspector, "dropdown_options"):
        op.create_table(
            "dropdown_options",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("category", sa.String(length=32), nullable=False),
            sa.Column("value", sa.String(length=128), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_dropdown_options_id"), "dropdown_options", ["id"], unique=False)
        op.create_index(op.f("ix_dropdown_options_category"), "dropdown_options", ["category"], unique=False)
        op.execute(
            sa.text(
                """
                INSERT INTO dropdown_options (id, category, value, sort_order, is_active, created_at)
                SELECT id, category, value, sort_order, is_active, created_at
                FROM field_options
                """
            )
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_dropdown_options_category"), table_name="dropdown_options")
    op.drop_index(op.f("ix_dropdown_options_id"), table_name="dropdown_options")
    op.drop_table("dropdown_options")

    op.drop_index(
        op.f("ix_application_question_responses_question_id"),
        table_name="application_question_responses",
    )
    op.drop_index(
        op.f("ix_application_question_responses_application_submission_id"),
        table_name="application_question_responses",
    )
    op.drop_index(op.f("ix_application_question_responses_id"), table_name="application_question_responses")
    op.drop_table("application_question_responses")

    op.drop_index(op.f("ix_application_submissions_user_id"), table_name="application_submissions")
    op.drop_constraint(
        "fk_application_submissions_user_id_users",
        "application_submissions",
        type_="foreignkey",
    )
    op.drop_column("application_submissions", "user_id")

    op.drop_column("questionnaire_questions", "answer_config_json")
    op.drop_column("questionnaire_questions", "answer_bank_key")
    op.drop_column("questionnaire_questions", "answer_type")

    op.drop_index(op.f("ix_job_listing_questions_question_id"), table_name="job_listing_questions")
    op.drop_index(op.f("ix_job_listing_questions_job_listing_id"), table_name="job_listing_questions")
    op.drop_index(op.f("ix_job_listing_questions_id"), table_name="job_listing_questions")
    op.drop_table("job_listing_questions")

    op.drop_column("job_listings", "ats_questions_url")
    op.drop_column("job_listings", "status")
    op.drop_column("job_listings", "code_id")

    op.drop_index(op.f("ix_profiles_user_id"), table_name="profiles")
    op.drop_index(op.f("ix_profiles_id"), table_name="profiles")
    op.drop_table("profiles")

    op.drop_constraint("fk_users_role_id_roles", "users", type_="foreignkey")
    op.drop_column("users", "role_id")

    op.drop_index(op.f("ix_roles_id"), table_name="roles")
    op.drop_table("roles")

"""Initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-03-02 00:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_metadata",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("release_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("semester", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=128), nullable=False),
        sa.Column("pay", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=2048), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_metadata_id"), "job_metadata", ["id"], unique=False)

    op.create_table(
        "job_listings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date_created", sa.DateTime(timezone=True), nullable=False),
        sa.Column("date_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("job", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_listings_id"), "job_listings", ["id"], unique=False)

    op.create_table(
        "questionnaire_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_listing_id", sa.Integer(), nullable=False),
        sa.Column("prompt", sa.String(length=512), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["job_listing_id"], ["job_listings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_questionnaire_questions_id"), "questionnaire_questions", ["id"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=128), nullable=False),
        sa.Column("password", sa.String(length=128), nullable=False),
        sa.Column("first_name", sa.String(length=128), nullable=False),
        sa.Column("last_name", sa.String(length=128), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

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

    op.create_table(
        "application_submissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_listing_id", sa.Integer(), nullable=False),
        sa.Column("applicant_name", sa.String(length=128), nullable=False),
        sa.Column("applicant_email", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("responses_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_listing_id"], ["job_listings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_application_submissions_id"), "application_submissions", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_application_submissions_id"), table_name="application_submissions")
    op.drop_table("application_submissions")

    op.drop_index(op.f("ix_applications_id"), table_name="applications")
    op.drop_table("applications")

    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

    op.drop_index(op.f("ix_questionnaire_questions_id"), table_name="questionnaire_questions")
    op.drop_table("questionnaire_questions")

    op.drop_index(op.f("ix_job_listings_id"), table_name="job_listings")
    op.drop_table("job_listings")

    op.drop_index(op.f("ix_job_metadata_id"), table_name="job_metadata")
    op.drop_table("job_metadata")

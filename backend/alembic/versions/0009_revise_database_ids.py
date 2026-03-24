"""Migration implementing ATS schema refinements from stakeholder notes.

Revision ID: 0009_revise_database_ids
Revises: 0008_align_relational_schema
Create Date: 2026-03-18 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0009_revise_database_ids"
down_revision = "0008_align_relational_schema"
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


def _fk_exists(inspector: sa.Inspector, table_name: str, fk_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return fk_name in {fk["name"] for fk in inspector.get_foreign_keys(table_name)}


def _uq_exists(inspector: sa.Inspector, table_name: str, uq_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return uq_name in {uq["name"] for uq in inspector.get_unique_constraints(table_name)}


def _add_audit_columns(table_name: str) -> None:
    inspector = sa.inspect(op.get_bind())
    if not _table_exists(inspector, table_name):
        return
    if not _column_exists(inspector, table_name, "created_at"):
        op.add_column(
            table_name,
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
    inspector = sa.inspect(op.get_bind())
    if not _column_exists(inspector, table_name, "updated_at"):
        op.add_column(
            table_name,
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Audit-log style timestamps across key business tables.
    for table_name in [
        "job_metadata",
        "job_listings",
        "questionnaire_questions",
        "users",
        "roles",
        "profiles",
        "field_options",
        "dropdown_options",
        "application_submissions",
        "application_review_scores",
        "application_review_comments",
        "application_question_responses",
        "job_listing_questions",
    ]:
        _add_audit_columns(table_name)

    inspector = sa.inspect(bind)
    if _column_exists(inspector, "profiles", "resume_s3_key"):
        op.drop_column("profiles", "resume_s3_key")
    if _column_exists(inspector, "profiles", "profile_edited_at") is False and _table_exists(inspector, "profiles"):
        op.add_column("profiles", sa.Column("profile_edited_at", sa.DateTime(timezone=True), nullable=True))

    if not _table_exists(inspector, "application_cycles"):
        op.create_table(
            "application_cycles",
            sa.Column("application_cycle_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("slug", sa.String(length=128), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("application_cycle_id"),
            sa.UniqueConstraint("slug", name="uq_application_cycles_slug"),
        )
        op.create_index("ix_application_cycles_application_cycle_id", "application_cycles", ["application_cycle_id"], unique=False)

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "job_listings"):
        if not _column_exists(inspector, "job_listings", "slug"):
            op.add_column("job_listings", sa.Column("slug", sa.String(length=128), nullable=True))
            op.execute(
                sa.text(
                    """
                    UPDATE job_listings
                    SET slug = CONCAT('job-listing-', id)
                    WHERE slug IS NULL
                    """
                )
            )
        inspector = sa.inspect(bind)
        if not _index_exists(inspector, "job_listings", "ix_job_listings_slug"):
            op.create_index("ix_job_listings_slug", "job_listings", ["slug"], unique=True)

        if not _column_exists(inspector, "job_listings", "application_cycle_id"):
            op.add_column("job_listings", sa.Column("application_cycle_id", sa.Integer(), nullable=True))
        inspector = sa.inspect(bind)
        if not _fk_exists(inspector, "job_listings", "fk_job_listings_application_cycle_id_application_cycles"):
            op.create_foreign_key(
                "fk_job_listings_application_cycle_id_application_cycles",
                "job_listings",
                "application_cycles",
                ["application_cycle_id"],
                ["application_cycle_id"],
            )
        if not _index_exists(inspector, "job_listings", "ix_job_listings_application_cycle_id"):
            op.create_index("ix_job_listings_application_cycle_id", "job_listings", ["application_cycle_id"], unique=False)

        # Remove deprecated identifiers/links.
        if _index_exists(inspector, "job_listings", "ix_job_listings_position_code"):
            op.drop_index("ix_job_listings_position_code", table_name="job_listings")
        if _index_exists(inspector, "job_listings", "ix_job_listings_candidate_intake_url"):
            op.drop_index("ix_job_listings_candidate_intake_url", table_name="job_listings")
        inspector = sa.inspect(bind)
        if _column_exists(inspector, "job_listings", "position_code"):
            op.drop_column("job_listings", "position_code")
        if _column_exists(inspector, "job_listings", "candidate_intake_url"):
            op.drop_column("job_listings", "candidate_intake_url")
        if _column_exists(inspector, "job_listings", "ats_questions_url"):
            op.drop_column("job_listings", "ats_questions_url")

        # Store description as JSON to support rich, structured content.
        inspector = sa.inspect(bind)
        if _column_exists(inspector, "job_listings", "description"):
            op.alter_column(
                "job_listings",
                "description",
                existing_type=sa.Text(),
                type_=sa.JSON(),
                postgresql_using="to_jsonb(description)",
            )

    if not _table_exists(inspector, "question_types"):
        op.create_table(
            "question_types",
            sa.Column("question_type_id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column("label", sa.String(length=128), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("question_type_id"),
            sa.UniqueConstraint("code", name="uq_question_types_code"),
        )
        op.create_index("ix_question_types_question_type_id", "question_types", ["question_type_id"], unique=False)

    for code, label in [
        ("free_text", "Free Text"),
        ("multiple_choice", "Multiple Choice"),
        ("yes_no", "Yes / No"),
        ("numeric", "Numeric"),
        ("file_upload", "File Upload"),
    ]:
        bind.execute(
            sa.text(
                """
                INSERT INTO question_types (code, label, created_at, updated_at)
                SELECT :code, :label, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                WHERE NOT EXISTS (SELECT 1 FROM question_types WHERE code = :code)
                """
            ),
            {"code": code, "label": label},
        )

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "questionnaire_questions"):
        if not _column_exists(inspector, "questionnaire_questions", "question_type_id"):
            op.add_column("questionnaire_questions", sa.Column("question_type_id", sa.Integer(), nullable=True))
        inspector = sa.inspect(bind)
        if not _fk_exists(inspector, "questionnaire_questions", "fk_questionnaire_questions_question_type_id_question_types"):
            op.create_foreign_key(
                "fk_questionnaire_questions_question_type_id_question_types",
                "questionnaire_questions",
                "question_types",
                ["question_type_id"],
                ["question_type_id"],
            )
        if not _index_exists(inspector, "questionnaire_questions", "ix_questionnaire_questions_question_type_id"):
            op.create_index(
                "ix_questionnaire_questions_question_type_id",
                "questionnaire_questions",
                ["question_type_id"],
                unique=False,
            )

        op.execute(
            sa.text(
                """
                UPDATE questionnaire_questions qq
                SET question_type_id = qt.question_type_id
                FROM question_types qt
                WHERE qq.question_type_id IS NULL
                  AND qt.code = LOWER(COALESCE(qq.question_type, qq.answer_type, 'free_text'))
                """
            )
        )
        op.execute(
            sa.text(
                """
                UPDATE questionnaire_questions qq
                SET question_type_id = qt.question_type_id
                FROM question_types qt
                WHERE qq.question_type_id IS NULL
                  AND qt.code = 'free_text'
                """
            )
        )

        inspector = sa.inspect(bind)
        for column_name in [
            "question_bank_key",
            "question_config_json",
            "answer_bank_key",
            "answer_config_json",
            "answer_type",
            "question_type",
        ]:
            if _column_exists(inspector, "questionnaire_questions", column_name):
                op.drop_column("questionnaire_questions", column_name)
                inspector = sa.inspect(bind)

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "job_listing_questions"):
        if not _column_exists(inspector, "job_listing_questions", "sequence_number"):
            op.add_column(
                "job_listing_questions",
                sa.Column("sequence_number", sa.Integer(), nullable=True, server_default="0"),
            )
        op.execute(
            sa.text(
                """
                UPDATE job_listing_questions jlq
                SET sequence_number = COALESCE(qq.sort_order, 0)
                FROM questionnaire_questions qq
                WHERE jlq.sequence_number IS NULL
                  AND qq.id = jlq.question_id
                """
            )
        )
        op.execute(
            sa.text(
                """
                UPDATE job_listing_questions
                SET sequence_number = 0
                WHERE sequence_number IS NULL
                """
            )
        )
        inspector = sa.inspect(bind)
        if not _uq_exists(inspector, "job_listing_questions", "uq_job_listing_questions_job_listing_id_sequence_number"):
            op.create_unique_constraint(
                "uq_job_listing_questions_job_listing_id_sequence_number",
                "job_listing_questions",
                ["job_listing_id", "sequence_number"],
            )

    if not _table_exists(inspector, "application_statuses"):
        op.create_table(
            "application_statuses",
            sa.Column("application_status_id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column("label", sa.String(length=128), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("application_status_id"),
            sa.UniqueConstraint("code", name="uq_application_statuses_code"),
        )
        op.create_index(
            "ix_application_statuses_application_status_id",
            "application_statuses",
            ["application_status_id"],
            unique=False,
        )
    for code, label in [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("in_review", "In Review"),
        ("assessment_sent", "Assessment Sent"),
        ("assessment_accepted", "Assessment Accepted"),
        ("interview_invited", "Interview Invited"),
        ("interview_completed", "Interview Completed"),
        ("offer_extended", "Offer Extended"),
        ("offer_accepted", "Offer Accepted"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]:
        bind.execute(
            sa.text(
                """
                INSERT INTO application_statuses (code, label, created_at, updated_at)
                SELECT :code, :label, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                WHERE NOT EXISTS (SELECT 1 FROM application_statuses WHERE code = :code)
                """
            ),
            {"code": code, "label": label},
        )

    inspector = sa.inspect(bind)
    if not _table_exists(inspector, "application_submission_status_events"):
        op.create_table(
            "application_submission_status_events",
            sa.Column("application_submission_status_event_id", sa.Integer(), nullable=False),
            sa.Column("application_submission_id", sa.Integer(), nullable=False),
            sa.Column("application_status_id", sa.Integer(), nullable=False),
            sa.Column("effective_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(
                ["application_submission_id"],
                ["application_submissions.id"],
                name="fk_status_events_submission_id_submissions",
            ),
            sa.ForeignKeyConstraint(
                ["application_status_id"],
                ["application_statuses.application_status_id"],
                name="fk_status_events_status_id_application_statuses",
            ),
            sa.ForeignKeyConstraint(
                ["created_by_user_id"],
                ["users.id"],
                name="fk_status_events_created_by_user_id_users",
            ),
            sa.PrimaryKeyConstraint("application_submission_status_event_id"),
        )
        op.create_index(
            "ix_application_submission_status_events_submission_id",
            "application_submission_status_events",
            ["application_submission_id"],
            unique=False,
        )
        op.create_index(
            "ix_application_submission_status_events_effective_at",
            "application_submission_status_events",
            ["effective_at"],
            unique=False,
        )

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "application_submissions"):
        for col_name, col_type, kwargs in [
            ("submitted_at", sa.DateTime(timezone=True), {"nullable": True}),
            ("is_draft", sa.Boolean(), {"nullable": False, "server_default": sa.true()}),
            ("sent_assessment", sa.Boolean(), {"nullable": False, "server_default": sa.false()}),
            ("accepted_assessment", sa.Boolean(), {"nullable": False, "server_default": sa.false()}),
            ("interview_invited", sa.Boolean(), {"nullable": False, "server_default": sa.false()}),
            ("interview_completed", sa.Boolean(), {"nullable": False, "server_default": sa.false()}),
            ("offer_extended", sa.Boolean(), {"nullable": False, "server_default": sa.false()}),
        ]:
            if not _column_exists(inspector, "application_submissions", col_name):
                op.add_column("application_submissions", sa.Column(col_name, col_type, **kwargs))
                inspector = sa.inspect(bind)

        if _column_exists(inspector, "application_submissions", "first_application_at"):
            op.drop_column("application_submissions", "first_application_at")

        op.execute(
            sa.text(
                """
                UPDATE application_submissions
                SET is_draft = CASE WHEN LOWER(COALESCE(status, '')) IN ('draft', 'in_progress') THEN TRUE ELSE FALSE END,
                    submitted_at = CASE
                        WHEN submitted_at IS NOT NULL THEN submitted_at
                        WHEN LOWER(COALESCE(status, '')) IN ('submitted', 'reviewed', 'scored', 'accepted', 'rejected') THEN created_at
                        ELSE NULL
                    END
                """
            )
        )

        op.execute(
            sa.text(
                """
                INSERT INTO application_submission_status_events (
                    application_submission_id,
                    application_status_id,
                    effective_at,
                    created_at,
                    updated_at
                )
                SELECT
                    s.id,
                    st.application_status_id,
                    COALESCE(s.submitted_at, s.created_at, CURRENT_TIMESTAMP),
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM application_submissions s
                JOIN application_statuses st ON st.code = LOWER(COALESCE(s.status, 'draft'))
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM application_submission_status_events e
                    WHERE e.application_submission_id = s.id
                )
                """
            )
        )

    if not _table_exists(inspector, "score_values"):
        op.create_table(
            "score_values",
            sa.Column("score_value_id", sa.Integer(), nullable=False),
            sa.Column("value", sa.Integer(), nullable=False),
            sa.Column("label", sa.String(length=64), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("score_value_id"),
            sa.UniqueConstraint("value", name="uq_score_values_value"),
        )
        op.create_index("ix_score_values_score_value_id", "score_values", ["score_value_id"], unique=False)

    op.execute(
        sa.text(
            """
            INSERT INTO score_values (value, label, created_at, updated_at)
            SELECT DISTINCT ars.score, CAST(ars.score AS VARCHAR(64)), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM application_review_scores ars
            WHERE ars.score IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM score_values sv WHERE sv.value = ars.score)
            """
        )
    )

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "application_review_scores"):
        if not _column_exists(inspector, "application_review_scores", "score_value_id"):
            op.add_column("application_review_scores", sa.Column("score_value_id", sa.Integer(), nullable=True))
        inspector = sa.inspect(bind)
        if not _fk_exists(inspector, "application_review_scores", "fk_application_review_scores_score_value_id_score_values"):
            op.create_foreign_key(
                "fk_application_review_scores_score_value_id_score_values",
                "application_review_scores",
                "score_values",
                ["score_value_id"],
                ["score_value_id"],
            )
        if not _index_exists(inspector, "application_review_scores", "ix_application_review_scores_score_value_id"):
            op.create_index(
                "ix_application_review_scores_score_value_id",
                "application_review_scores",
                ["score_value_id"],
                unique=False,
            )
        op.execute(
            sa.text(
                """
                UPDATE application_review_scores ars
                SET score_value_id = sv.score_value_id
                FROM score_values sv
                WHERE ars.score_value_id IS NULL
                  AND sv.value = ars.score
                """
            )
        )
        inspector = sa.inspect(bind)
        if _column_exists(inspector, "application_review_scores", "score"):
            op.drop_column("application_review_scores", "score")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "application_question_responses") and _column_exists(
        inspector, "application_question_responses", "response_text"
    ):
        op.alter_column(
            "application_question_responses",
            "response_text",
            existing_type=sa.Text(),
            type_=sa.JSON(),
            postgresql_using="to_jsonb(response_text)",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _table_exists(inspector, "application_question_responses") and _column_exists(
        inspector, "application_question_responses", "response_text"
    ):
        op.alter_column(
            "application_question_responses",
            "response_text",
            existing_type=sa.JSON(),
            type_=sa.Text(),
            postgresql_using="response_text::text",
        )

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "application_review_scores"):
        if not _column_exists(inspector, "application_review_scores", "score"):
            op.add_column("application_review_scores", sa.Column("score", sa.Integer(), nullable=True))
        op.execute(
            sa.text(
                """
                UPDATE application_review_scores ars
                SET score = sv.value
                FROM score_values sv
                WHERE ars.score_value_id = sv.score_value_id
                """
            )
        )
        if _index_exists(inspector, "application_review_scores", "ix_application_review_scores_score_value_id"):
            op.drop_index("ix_application_review_scores_score_value_id", table_name="application_review_scores")
        inspector = sa.inspect(bind)
        if _fk_exists(inspector, "application_review_scores", "fk_application_review_scores_score_value_id_score_values"):
            op.drop_constraint(
                "fk_application_review_scores_score_value_id_score_values",
                "application_review_scores",
                type_="foreignkey",
            )
        inspector = sa.inspect(bind)
        if _column_exists(inspector, "application_review_scores", "score_value_id"):
            op.drop_column("application_review_scores", "score_value_id")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "score_values"):
        if _index_exists(inspector, "score_values", "ix_score_values_score_value_id"):
            op.drop_index("ix_score_values_score_value_id", table_name="score_values")
        op.drop_table("score_values")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "application_submissions"):
        for col_name in [
            "offer_extended",
            "interview_completed",
            "interview_invited",
            "accepted_assessment",
            "sent_assessment",
            "is_draft",
            "submitted_at",
        ]:
            if _column_exists(inspector, "application_submissions", col_name):
                op.drop_column("application_submissions", col_name)
                inspector = sa.inspect(bind)

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "application_submission_status_events"):
        if _index_exists(inspector, "application_submission_status_events", "ix_application_submission_status_events_effective_at"):
            op.drop_index(
                "ix_application_submission_status_events_effective_at",
                table_name="application_submission_status_events",
            )
        if _index_exists(inspector, "application_submission_status_events", "ix_application_submission_status_events_submission_id"):
            op.drop_index(
                "ix_application_submission_status_events_submission_id",
                table_name="application_submission_status_events",
            )
        op.drop_table("application_submission_status_events")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "application_statuses"):
        if _index_exists(inspector, "application_statuses", "ix_application_statuses_application_status_id"):
            op.drop_index("ix_application_statuses_application_status_id", table_name="application_statuses")
        op.drop_table("application_statuses")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "job_listing_questions"):
        if _uq_exists(inspector, "job_listing_questions", "uq_job_listing_questions_job_listing_id_sequence_number"):
            op.drop_constraint(
                "uq_job_listing_questions_job_listing_id_sequence_number",
                "job_listing_questions",
                type_="unique",
            )
        inspector = sa.inspect(bind)
        if _column_exists(inspector, "job_listing_questions", "sequence_number"):
            op.drop_column("job_listing_questions", "sequence_number")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "questionnaire_questions"):
        if not _column_exists(inspector, "questionnaire_questions", "question_type"):
            op.add_column(
                "questionnaire_questions",
                sa.Column("question_type", sa.String(length=64), nullable=False, server_default="free_text"),
            )
        for col_name, col_type in [
            ("answer_type", sa.String(length=64)),
            ("question_bank_key", sa.String(length=128)),
            ("question_config_json", sa.JSON()),
            ("answer_bank_key", sa.String(length=128)),
            ("answer_config_json", sa.JSON()),
        ]:
            inspector = sa.inspect(bind)
            if not _column_exists(inspector, "questionnaire_questions", col_name):
                op.add_column("questionnaire_questions", sa.Column(col_name, col_type, nullable=True))

        inspector = sa.inspect(bind)
        if _index_exists(inspector, "questionnaire_questions", "ix_questionnaire_questions_question_type_id"):
            op.drop_index("ix_questionnaire_questions_question_type_id", table_name="questionnaire_questions")
        if _fk_exists(inspector, "questionnaire_questions", "fk_questionnaire_questions_question_type_id_question_types"):
            op.drop_constraint(
                "fk_questionnaire_questions_question_type_id_question_types",
                "questionnaire_questions",
                type_="foreignkey",
            )
        inspector = sa.inspect(bind)
        if _column_exists(inspector, "questionnaire_questions", "question_type_id"):
            op.drop_column("questionnaire_questions", "question_type_id")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "question_types"):
        if _index_exists(inspector, "question_types", "ix_question_types_question_type_id"):
            op.drop_index("ix_question_types_question_type_id", table_name="question_types")
        op.drop_table("question_types")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "job_listings"):
        if _column_exists(inspector, "job_listings", "description"):
            op.alter_column(
                "job_listings",
                "description",
                existing_type=sa.JSON(),
                type_=sa.Text(),
                postgresql_using="description::text",
            )
        if not _column_exists(inspector, "job_listings", "position_code"):
            op.add_column("job_listings", sa.Column("position_code", sa.String(length=64), nullable=True))
            op.create_index("ix_job_listings_position_code", "job_listings", ["position_code"], unique=True)
        inspector = sa.inspect(bind)
        if not _column_exists(inspector, "job_listings", "candidate_intake_url"):
            op.add_column("job_listings", sa.Column("candidate_intake_url", sa.String(length=255), nullable=True))
            op.create_index("ix_job_listings_candidate_intake_url", "job_listings", ["candidate_intake_url"], unique=True)
        inspector = sa.inspect(bind)
        if not _column_exists(inspector, "job_listings", "ats_questions_url"):
            op.add_column("job_listings", sa.Column("ats_questions_url", sa.String(length=512), nullable=True))

        if _index_exists(inspector, "job_listings", "ix_job_listings_application_cycle_id"):
            op.drop_index("ix_job_listings_application_cycle_id", table_name="job_listings")
        if _fk_exists(inspector, "job_listings", "fk_job_listings_application_cycle_id_application_cycles"):
            op.drop_constraint(
                "fk_job_listings_application_cycle_id_application_cycles",
                "job_listings",
                type_="foreignkey",
            )
        inspector = sa.inspect(bind)
        if _column_exists(inspector, "job_listings", "application_cycle_id"):
            op.drop_column("job_listings", "application_cycle_id")

        inspector = sa.inspect(bind)
        if _index_exists(inspector, "job_listings", "ix_job_listings_slug"):
            op.drop_index("ix_job_listings_slug", table_name="job_listings")
        if _column_exists(inspector, "job_listings", "slug"):
            op.drop_column("job_listings", "slug")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "application_cycles"):
        if _index_exists(inspector, "application_cycles", "ix_application_cycles_application_cycle_id"):
            op.drop_index("ix_application_cycles_application_cycle_id", table_name="application_cycles")
        op.drop_table("application_cycles")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "profiles"):
        if not _column_exists(inspector, "profiles", "resume_s3_key"):
            op.add_column("profiles", sa.Column("resume_s3_key", sa.String(length=512), nullable=True))
        if _column_exists(inspector, "profiles", "profile_edited_at"):
            op.drop_column("profiles", "profile_edited_at")

    # Keep audit columns in downgrade because they are non-breaking operational metadata.

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, synonym

from app.db import Base


def _utcnow() -> datetime:
    return datetime.utcnow()


class JobMetadata(Base):
    __tablename__ = "job_metadata"

    metadata_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    release_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    semester: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(128), nullable=False)
    pay: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(2048), nullable=False)
    metadata_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    metadata_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("metadata_id")
    created_at = synonym("metadata_created_at")
    updated_at = synonym("metadata_updated_at")


class ApplicationCycle(Base):
    __tablename__ = "application_cycles"

    application_cycle_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)


class JobListing(Base):
    __tablename__ = "job_listings"

    listing_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    listing_date_created: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    listing_date_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    position_title: Mapped[str] = mapped_column(String(128), nullable=False)
    job: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    listing_slug: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    application_cycle_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("application_cycles.application_cycle_id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    required_skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    listing_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    listing_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("listing_id")
    position_code = synonym("code_id")
    slug = synonym("listing_slug")
    date_created = synonym("listing_date_created")
    date_end = synonym("listing_date_end")
    created_at = synonym("listing_created_at")
    updated_at = synonym("listing_updated_at")


class QuestionType(Base):
    __tablename__ = "question_types"

    question_type_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    question_type_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    question_type_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)


class QuestionnaireQuestion(Base):
    __tablename__ = "questionnaire_questions"

    question_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_listing_id: Mapped[int] = mapped_column(Integer, ForeignKey("job_listings.listing_id"), nullable=False)
    prompt: Mapped[str] = mapped_column(String(512), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    question_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("question_types.question_type_id"), nullable=False)
    character_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_global: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    question_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    question_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("question_id")
    created_at = synonym("question_created_at")
    updated_at = synonym("question_updated_at")


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(128), nullable=False)
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    consented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    role_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("roles.role_id"), nullable=True)
    user_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    user_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    user_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("user_id")
    created_at = synonym("user_created_at")
    updated_at = synonym("user_updated_at")


class Role(Base):
    __tablename__ = "roles"

    role_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    role_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    role_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("role_id")
    created_at = synonym("role_created_at")
    updated_at = synonym("role_updated_at")


class Profile(Base):
    __tablename__ = "profiles"

    profile_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False, unique=True, index=True)
    full_legal_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expected_graduation_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    current_year: Mapped[str | None] = mapped_column(String(64), nullable=True)
    coop_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    major: Mapped[str | None] = mapped_column(String(128), nullable=True)
    minor: Mapped[str | None] = mapped_column(String(128), nullable=True)
    concentration: Mapped[str | None] = mapped_column(String(128), nullable=True)
    gpa: Mapped[str | None] = mapped_column(String(16), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    club: Mapped[str | None] = mapped_column(String(255), nullable=True)
    past_experience_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unique_experience_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    profile_edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    profile_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    profile_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)


class FieldOption(Base):
    __tablename__ = "field_options"

    field_option_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    value: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    field_option_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    field_option_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("field_option_id")
    created_at = synonym("field_option_created_at")
    updated_at = synonym("field_option_updated_at")


class ApplicationSubmission(Base):
    __tablename__ = "application_submissions"

    application_submission_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_listing_id: Mapped[int] = mapped_column(Integer, ForeignKey("job_listings.listing_id"), nullable=False)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    applicant_name: Mapped[str] = mapped_column(String(128), nullable=False)
    applicant_email: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="draft")
    responses_json: Mapped[str] = mapped_column(Text, nullable=False)
    profile_snapshot_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    resume_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_draft: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sent_assessment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    accepted_assessment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    interview_invited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    interview_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    offer_extended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    application_submission_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    application_submission_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("application_submission_id")
    created_at = synonym("application_submission_created_at")
    updated_at = synonym("application_submission_updated_at")


class ApplicationStatus(Base):
    __tablename__ = "application_statuses"

    application_status_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    application_status_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    application_status_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("application_status_id")
    created_at = synonym("application_status_created_at")
    updated_at = synonym("application_status_updated_at")


class ApplicationSubmissionStatusEvent(Base):
    __tablename__ = "application_submission_status_events"

    application_submission_status_event_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_submission_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("application_submissions.application_submission_id"), nullable=False, index=True
    )
    application_status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("application_statuses.application_status_id"), nullable=False, index=True
    )
    effective_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    application_submission_status_event_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    application_submission_status_event_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("application_submission_status_event_id")
    created_at = synonym("application_submission_status_event_created_at")
    updated_at = synonym("application_submission_status_event_updated_at")


class ScoreValue(Base):
    __tablename__ = "score_values"

    score_value_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    score_value_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    score_value_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("score_value_id")
    created_at = synonym("score_value_created_at")
    updated_at = synonym("score_value_updated_at")


class ApplicationReviewScore(Base):
    __tablename__ = "application_review_scores"

    application_review_score_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_submission_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("application_submissions.application_submission_id"), nullable=False, index=True
    )
    reviewer_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    score_value_id: Mapped[int] = mapped_column(Integer, ForeignKey("score_values.score_value_id"), nullable=False, index=True)
    application_review_score_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    application_review_score_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("application_review_score_id")
    created_at = synonym("application_review_score_created_at")
    updated_at = synonym("application_review_score_updated_at")


class ApplicationReviewComment(Base):
    __tablename__ = "application_review_comments"

    application_review_comment_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_submission_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("application_submissions.application_submission_id"), nullable=False, index=True
    )
    reviewer_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    application_review_comment_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    application_review_comment_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    id = synonym("application_review_comment_id")
    created_at = synonym("application_review_comment_created_at")
    updated_at = synonym("application_review_comment_updated_at")


class ApplicationQuestionResponse(Base):
    __tablename__ = "application_question_responses"

    application_question_response_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_submission_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("application_submissions.application_submission_id"), nullable=False, index=True
    )
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questionnaire_questions.question_id"), nullable=False, index=True
    )
    response_text: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    application_question_response_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    application_question_response_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)


class JobListingQuestion(Base):
    __tablename__ = "job_listing_questions"

    job_listing_question_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_listing_id: Mapped[int] = mapped_column(Integer, ForeignKey("job_listings.listing_id"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questionnaire_questions.question_id"), nullable=False, index=True
    )
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    job_listing_question_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)
    job_listing_question_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

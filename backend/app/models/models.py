from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class JobMetadata(Base):
    __tablename__ = "job_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    release_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    semester: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(128), nullable=False)
    pay: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(2048), nullable=False)


class JobListing(Base):
    __tablename__ = "job_listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date_created: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    date_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    position_title: Mapped[str] = mapped_column(String(128), nullable=False)
    position_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    job: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    required_skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    candidate_intake_url: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)


class QuestionnaireQuestion(Base):
    __tablename__ = "questionnaire_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_listing_id: Mapped[int] = mapped_column(Integer, ForeignKey("job_listings.id"), nullable=False)
    prompt: Mapped[str] = mapped_column(String(512), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    question_type: Mapped[str] = mapped_column(String(64), nullable=False, default="free_text")
    character_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    question_bank_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    question_config_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    is_global: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(128), nullable=False)
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    consented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)


class FieldOption(Base):
    __tablename__ = "field_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    value: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class ApplicationSubmission(Base):
    __tablename__ = "application_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_listing_id: Mapped[int] = mapped_column(Integer, ForeignKey("job_listings.id"), nullable=False)
    applicant_name: Mapped[str] = mapped_column(String(128), nullable=False)
    applicant_email: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="submitted")
    responses_json: Mapped[str] = mapped_column(Text, nullable=False)
    profile_snapshot_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    resume_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class ApplicationReviewScore(Base):
    __tablename__ = "application_review_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_submission_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("application_submissions.id"), nullable=False, index=True
    )
    reviewer_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class ApplicationReviewComment(Base):
    __tablename__ = "application_review_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_submission_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("application_submissions.id"), nullable=False, index=True
    )
    reviewer_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

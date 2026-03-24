import json
from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.authn import ensure_admin_user, get_or_create_user_from_access_token, require_bearer_token
from app.api.schemas import (
    ApplicationReviewCommentCreate,
    ApplicationReviewCommentRead,
    ApplicationReviewScoreCreate,
    ApplicationReviewScoreRead,
    CandidateReviewDetail,
    CandidateReviewSearchRow,
)
from app.config import settings
from app.db import get_db
from app.models.models import (
    ApplicationReviewComment,
    ApplicationReviewScore,
    ApplicationSubmission,
    JobListing,
    ScoreValue,
    User,
)
from app.services.storage import storage_service

router = APIRouter(prefix="/api/admin/review", tags=["admin-review"])


def _to_score_read(row: ApplicationReviewScore, reviewer_name: str, score_value: ScoreValue | None) -> ApplicationReviewScoreRead:
    return ApplicationReviewScoreRead(
        application_review_score_id=row.application_review_score_id,
        application_submission_id=row.application_submission_id,
        reviewer_user_id=row.reviewer_user_id,
        reviewer_name=reviewer_name,
        score_value_id=row.score_value_id,
        score=score_value.value if score_value else None,
        application_review_score_created_at=row.application_review_score_created_at,
    )


def _to_comment_read(row: ApplicationReviewComment, reviewer_name: str) -> ApplicationReviewCommentRead:
    return ApplicationReviewCommentRead(
        application_review_comment_id=row.application_review_comment_id,
        application_submission_id=row.application_submission_id,
        reviewer_user_id=row.reviewer_user_id,
        reviewer_name=reviewer_name,
        comment=row.comment,
        application_review_comment_created_at=row.application_review_comment_created_at,
    )


def _get_global_fields(snapshot: dict) -> dict:
    return snapshot.get("user_metadata", {}).get("global_profile", {}) if isinstance(snapshot, dict) else {}


def _within_date_range(raw_value: str | None, start: str | None, end: str | None) -> bool:
    if not raw_value:
        return True
    try:
        value = date.fromisoformat(raw_value[:10])
    except Exception:
        return True
    if start:
        try:
            if value < date.fromisoformat(start):
                return False
        except Exception:
            pass
    if end:
        try:
            if value > date.fromisoformat(end):
                return False
        except Exception:
            pass
    return True


@router.get("/search", response_model=list[CandidateReviewSearchRow])
def search_candidates(
    candidate_name: str | None = None,
    northeastern_email: str | None = None,
    major: str | None = None,
    college: str | None = None,
    grad_start: str | None = None,
    grad_end: str | None = None,
    coop_number: str | None = None,
    year_grade_level: str | None = None,
    position: str | None = None,
    cycle: str | None = None,
    application_status: str | None = None,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[CandidateReviewSearchRow]:
    token = require_bearer_token(authorization)
    ensure_admin_user(db, token)

    submissions = db.query(ApplicationSubmission).order_by(ApplicationSubmission.created_at.desc()).all()
    rows: list[CandidateReviewSearchRow] = []
    for submission in submissions:
        position_row = db.query(JobListing).filter(JobListing.id == submission.job_listing_id).first()
        snapshot = submission.profile_snapshot_json or {}
        global_profile = _get_global_fields(snapshot)

        candidate_name_value = submission.applicant_name
        email_value = submission.applicant_email
        major_value = str(global_profile.get("Major(s) - selected from a maintained dropdown list", "") or "")
        college_value = str(global_profile.get("College / school within Northeastern", "") or "")
        grad_value = str(global_profile.get("Expected graduation date", "") or "")
        coop_value = str(global_profile.get("Co-op number (1st, 2nd, 3rd, etc.)", "") or "")
        year_value = str(global_profile.get("Current year / grade level", "") or "")
        cycle_value = str(global_profile.get("Cycle", "") or "")
        position_value = position_row.position_title if position_row else f"Position {submission.job_listing_id}"
        status_value = submission.status

        if candidate_name and candidate_name.lower() not in candidate_name_value.lower():
            continue
        if northeastern_email and northeastern_email.lower() not in email_value.lower():
            continue
        if major and major.lower() not in major_value.lower():
            continue
        if college and college.lower() not in college_value.lower():
            continue
        if coop_number and coop_number.lower() not in coop_value.lower():
            continue
        if year_grade_level and year_grade_level.lower() not in year_value.lower():
            continue
        if position and position.lower() not in position_value.lower():
            continue
        if cycle and cycle.lower() not in cycle_value.lower():
            continue
        if application_status and application_status.lower() not in status_value.lower():
            continue
        if not _within_date_range(grad_value, grad_start, grad_end):
            continue

        rows.append(
            CandidateReviewSearchRow(
                submission_id=submission.id,
                candidate_name=candidate_name_value,
                candidate_email=email_value,
                major=major_value or None,
                graduation_date=grad_value or None,
                coop_number=coop_value or None,
                year_grade_level=year_value or None,
                college=college_value or None,
                position_applied_for=position_value,
                cycle=cycle_value or None,
                application_status=status_value,
            )
        )
    return rows


@router.get("/applications/{submission_id}", response_model=CandidateReviewDetail)
def get_review_detail(
    submission_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> CandidateReviewDetail:
    token = require_bearer_token(authorization)
    viewer = get_or_create_user_from_access_token(db, token)
    if not viewer.is_active:
        raise HTTPException(status_code=403, detail="Active account required.")

    submission = db.query(ApplicationSubmission).filter(ApplicationSubmission.id == submission_id).first()
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    position = db.query(JobListing).filter(JobListing.id == submission.job_listing_id).first()
    if position is None:
        raise HTTPException(status_code=404, detail="Position not found")

    answers: list[dict] = []
    try:
        parsed = json.loads(submission.responses_json)
        if isinstance(parsed, list):
            answers = [item for item in parsed if isinstance(item, dict)]
    except Exception:
        answers = []

    score_rows = (
        db.query(ApplicationReviewScore)
        .filter(ApplicationReviewScore.application_submission_id == submission.id)
        .order_by(ApplicationReviewScore.created_at.desc())
        .all()
    )
    comment_rows = (
        db.query(ApplicationReviewComment)
        .filter(ApplicationReviewComment.application_submission_id == submission.id)
        .order_by(ApplicationReviewComment.created_at.desc())
        .all()
    )

    scores: list[ApplicationReviewScoreRead] = []
    for row in score_rows:
        reviewer = db.query(User).filter(User.id == row.reviewer_user_id).first()
        score_value = db.query(ScoreValue).filter(ScoreValue.score_value_id == row.score_value_id).first()
        reviewer_name = f"{reviewer.first_name} {reviewer.last_name}".strip() if reviewer else f"Reviewer {row.reviewer_user_id}"
        scores.append(_to_score_read(row, reviewer_name, score_value))

    comments: list[ApplicationReviewCommentRead] = []
    for row in comment_rows:
        reviewer = db.query(User).filter(User.id == row.reviewer_user_id).first()
        reviewer_name = f"{reviewer.first_name} {reviewer.last_name}".strip() if reviewer else f"Reviewer {row.reviewer_user_id}"
        comments.append(_to_comment_read(row, reviewer_name))

    resume_url = (
        storage_service.get_view_url(settings.s3_bucket_resumes, submission.resume_s3_key)
        if submission.resume_s3_key
        else None
    )
    return CandidateReviewDetail(
        submission=submission,
        position_title=position.position_title,
        position_slug=position.listing_slug,
        position_code=position.code_id,
        global_profile_fields=_get_global_fields(submission.profile_snapshot_json or {}),
        position_question_answers=answers,
        resume_view_url=resume_url,
        scores=scores,
        comments=comments,
    )


@router.post("/applications/{submission_id}/scores", response_model=ApplicationReviewScoreRead)
def add_score(
    submission_id: int,
    payload: ApplicationReviewScoreCreate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ApplicationReviewScoreRead:
    token = require_bearer_token(authorization)
    reviewer = ensure_admin_user(db, token)
    submission = db.query(ApplicationSubmission).filter(ApplicationSubmission.id == submission_id).first()
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    score_value_id = payload.score_value_id
    score_value = None
    if score_value_id is not None:
        score_value = db.query(ScoreValue).filter(ScoreValue.score_value_id == score_value_id).first()
    elif payload.score is not None:
        score_value = db.query(ScoreValue).filter(ScoreValue.value == payload.score).first()
        if score_value is not None:
            score_value_id = score_value.score_value_id
    if score_value is None or score_value_id is None:
        raise HTTPException(status_code=400, detail="Valid score_value_id or score is required")
    score = ApplicationReviewScore(
        application_submission_id=submission_id,
        reviewer_user_id=reviewer.id,
        score_value_id=score_value_id,
    )
    db.add(score)
    submission.status = "scored"
    db.add(submission)
    db.commit()
    db.refresh(score)
    return _to_score_read(score, f"{reviewer.first_name} {reviewer.last_name}".strip(), score_value)


@router.post("/applications/{submission_id}/comments", response_model=ApplicationReviewCommentRead)
def add_comment(
    submission_id: int,
    payload: ApplicationReviewCommentCreate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ApplicationReviewCommentRead:
    token = require_bearer_token(authorization)
    reviewer = ensure_admin_user(db, token)
    submission = db.query(ApplicationSubmission).filter(ApplicationSubmission.id == submission_id).first()
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    comment = ApplicationReviewComment(
        application_submission_id=submission_id,
        reviewer_user_id=reviewer.id,
        comment=payload.comment,
    )
    db.add(comment)
    if submission.status == "submitted":
        submission.status = "reviewed"
        db.add(submission)
    db.commit()
    db.refresh(comment)
    return _to_comment_read(comment, f"{reviewer.first_name} {reviewer.last_name}".strip())

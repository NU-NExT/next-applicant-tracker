from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.authn import ensure_admin_user, require_bearer_token
from app.api.schemas import (
    ApplicationScoreDetail,
    ApplicationScoreSubmit,
    ScoreLabel,
    ScoreSummaryResponse,
)
from app.db import get_db
from app.models.models import (
    ApplicationReviewScore,
    ApplicationSubmission,
    ScoreValue,
    User,
)

router = APIRouter(prefix="/api/applications", tags=["applications"])

_ALL_LABELS = [label.value for label in ScoreLabel]


def _build_score_detail(row: ApplicationReviewScore, db: Session) -> ApplicationScoreDetail:
    reviewer = db.query(User).filter(User.user_id == row.reviewer_user_id).first()
    score_value = db.query(ScoreValue).filter(ScoreValue.score_value_id == row.score_value_id).first()
    reviewer_name = f"{reviewer.first_name} {reviewer.last_name}".strip() if reviewer else f"Reviewer {row.reviewer_user_id}"
    reviewer_email = reviewer.email if reviewer else ""
    return ApplicationScoreDetail(
        application_review_score_id=row.application_review_score_id,
        application_submission_id=row.application_submission_id,
        score_label=score_value.label if score_value else "Unknown",
        reviewer_name=reviewer_name,
        reviewer_email=reviewer_email,
        created_at=row.application_review_score_created_at,
    )


@router.get("/{application_id}/scores", response_model=list[ApplicationScoreDetail])
def list_scores(
    application_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[ApplicationScoreDetail]:
    token = require_bearer_token(authorization)
    ensure_admin_user(db, token)

    submission = (
        db.query(ApplicationSubmission)
        .filter(ApplicationSubmission.application_submission_id == application_id)
        .first()
    )
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    rows = (
        db.query(ApplicationReviewScore)
        .filter(ApplicationReviewScore.application_submission_id == application_id)
        .order_by(ApplicationReviewScore.application_review_score_created_at.desc())
        .all()
    )
    return [_build_score_detail(row, db) for row in rows]


@router.post("/{application_id}/scores", response_model=ApplicationScoreDetail, status_code=201)
def submit_score(
    application_id: int,
    payload: ApplicationScoreSubmit,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ApplicationScoreDetail:
    token = require_bearer_token(authorization)
    admin_user = ensure_admin_user(db, token)

    submission = (
        db.query(ApplicationSubmission)
        .filter(ApplicationSubmission.application_submission_id == application_id)
        .first()
    )
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    score_value = db.query(ScoreValue).filter(ScoreValue.label == payload.score_label.value).first()
    if score_value is None:
        raise HTTPException(
            status_code=400,
            detail=f"Score label '{payload.score_label.value}' not found. Ensure the database has been seeded.",
        )

    score = ApplicationReviewScore(
        application_submission_id=application_id,
        reviewer_user_id=admin_user.user_id,
        score_value_id=score_value.score_value_id,
    )
    db.add(score)
    submission.status = "scored"
    db.add(submission)
    db.commit()
    db.refresh(score)

    return ApplicationScoreDetail(
        application_review_score_id=score.application_review_score_id,
        application_submission_id=score.application_submission_id,
        score_label=score_value.label,
        reviewer_name=f"{admin_user.first_name} {admin_user.last_name}".strip(),
        reviewer_email=admin_user.email,
        created_at=score.application_review_score_created_at,
    )


@router.get("/{application_id}/score-summary", response_model=ScoreSummaryResponse)
def score_summary(
    application_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ScoreSummaryResponse:
    token = require_bearer_token(authorization)
    ensure_admin_user(db, token)

    submission = (
        db.query(ApplicationSubmission)
        .filter(ApplicationSubmission.application_submission_id == application_id)
        .first()
    )
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    rows = (
        db.query(ApplicationReviewScore)
        .filter(ApplicationReviewScore.application_submission_id == application_id)
        .order_by(ApplicationReviewScore.application_review_score_created_at.desc())
        .all()
    )

    score_counts: dict[str, int] = {label: 0 for label in _ALL_LABELS}
    individual_scores: list[ApplicationScoreDetail] = []
    for row in rows:
        detail = _build_score_detail(row, db)
        individual_scores.append(detail)
        if detail.score_label in score_counts:
            score_counts[detail.score_label] += 1

    return ScoreSummaryResponse(
        total_reviews=len(rows),
        score_counts=score_counts,
        individual_scores=individual_scores,
    )

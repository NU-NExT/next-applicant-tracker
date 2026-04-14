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
_LABEL_TO_VALUE = {
    ScoreLabel.strong.value: 1,
    ScoreLabel.potential.value: 2,
    ScoreLabel.defer.value: 3,
    ScoreLabel.deny.value: 4,
}
_VALUE_TO_LABEL = {value: label for label, value in _LABEL_TO_VALUE.items()}


def _normalized_score_label(score_value: ScoreValue | None) -> str:
    if score_value is None:
        return "Unknown"
    if score_value.label in _ALL_LABELS:
        return score_value.label
    return _VALUE_TO_LABEL.get(score_value.value, score_value.label or "Unknown")


def _get_or_create_score_value_for_label(label: str, db: Session) -> ScoreValue | None:
    score_value = db.query(ScoreValue).filter(ScoreValue.label == label).first()
    if score_value is not None:
        return score_value

    mapped_value = _LABEL_TO_VALUE.get(label)
    if mapped_value is None:
        return None

    by_value = db.query(ScoreValue).filter(ScoreValue.value == mapped_value).first()
    if by_value is not None:
        if by_value.label != label:
            by_value.label = label
            db.add(by_value)
            db.flush()
        return by_value

    created = ScoreValue(value=mapped_value, label=label)
    db.add(created)
    db.flush()
    return created


def _build_score_detail(row: ApplicationReviewScore, db: Session) -> ApplicationScoreDetail:
    reviewer = db.query(User).filter(User.user_id == row.reviewer_user_id).first()
    score_value = db.query(ScoreValue).filter(ScoreValue.score_value_id == row.score_value_id).first()
    reviewer_name = f"{reviewer.first_name} {reviewer.last_name}".strip() if reviewer else f"Reviewer {row.reviewer_user_id}"
    reviewer_email = reviewer.email if reviewer else ""
    return ApplicationScoreDetail(
        application_review_score_id=row.application_review_score_id,
        application_submission_id=row.application_submission_id,
        score_label=_normalized_score_label(score_value),
        reviewer_name=reviewer_name,
        reviewer_email=reviewer_email,
        created_at=row.application_review_score_updated_at,
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

    score_value = _get_or_create_score_value_for_label(payload.score_label.value, db)
    if score_value is None:
        raise HTTPException(
            status_code=400,
            detail=f"Score label '{payload.score_label.value}' is invalid.",
        )

    existing_score = (
        db.query(ApplicationReviewScore)
        .filter(
            ApplicationReviewScore.application_submission_id == application_id,
            ApplicationReviewScore.reviewer_user_id == admin_user.user_id,
        )
        .first()
    )

    if existing_score:
        existing_score.score_value_id = score_value.score_value_id
        db.commit()
        db.refresh(existing_score)
        score = existing_score
    else:
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
        created_at=score.application_review_score_updated_at,
    )


@router.delete("/{application_id}/scores", status_code=204)
def delete_score(
    application_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> None:
    token = require_bearer_token(authorization)
    admin_user = ensure_admin_user(db, token)

    score = (
        db.query(ApplicationReviewScore)
        .filter(
            ApplicationReviewScore.application_submission_id == application_id,
            ApplicationReviewScore.reviewer_user_id == admin_user.user_id,
        )
        .first()
    )
    if score is None:
        raise HTTPException(status_code=404, detail="Score not found")

    db.delete(score)
    db.commit()


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

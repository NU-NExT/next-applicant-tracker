from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.models import QuestionnaireQuestion

router = APIRouter(prefix="/api/repository", tags=["repository"])

FALLBACK_QUESTIONS = [
    "Tell us about your relevant experience for this role.",
    "Describe a project where you collaborated with a team under deadlines.",
    "What interests you about working with NExT Consulting?",
]


@router.get("/{job_listing_id}/questions", response_model=list[dict[str, str]])
def get_questions_for_listing(job_listing_id: int, db: Session = Depends(get_db)) -> list[dict[str, str]]:
    questions = (
        db.query(QuestionnaireQuestion)
        .filter(QuestionnaireQuestion.job_listing_id == job_listing_id)
        .order_by(QuestionnaireQuestion.sort_order.asc(), QuestionnaireQuestion.id.asc())
        .all()
    )
    if not questions:
        return [{"prompt": q} for q in FALLBACK_QUESTIONS]
    return [{"prompt": q.prompt} for q in questions]

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.models import JobListing, QuestionnaireQuestion

router = APIRouter(prefix="/api/repository", tags=["repository"])

FALLBACK_QUESTIONS = [
    "Tell us about your relevant experience for this role.",
    "Describe a project where you collaborated with a team under deadlines.",
    "What interests you about working with NExT Consulting?",
]


def _serialize_question(question: QuestionnaireQuestion) -> dict:
    return {
        "question_id": question.question_id,
        "prompt": question.prompt,
        "question_type_id": question.question_type_id,
        "character_limit": question.character_limit,
        "is_global": question.is_global,
    }


@router.get("/{job_listing_id}/questions", response_model=list[dict])
def get_questions_for_listing(job_listing_id: int, db: Session = Depends(get_db)) -> list[dict]:
    questions = (
        db.query(QuestionnaireQuestion)
        .filter(QuestionnaireQuestion.job_listing_id == job_listing_id)
        .order_by(QuestionnaireQuestion.sort_order.asc(), QuestionnaireQuestion.question_id.asc())
        .all()
    )
    if not questions:
        return [{"prompt": q, "question_type_id": None} for q in FALLBACK_QUESTIONS]
    return [_serialize_question(q) for q in questions]


@router.get("/by-position/{position_code}/questions", response_model=list[dict])
def get_questions_for_position_code(position_code: str, db: Session = Depends(get_db)) -> list[dict]:
    position = db.query(JobListing).filter(JobListing.code_id == position_code.strip().upper()).first()
    if not position:
        return [{"prompt": q, "question_type_id": None} for q in FALLBACK_QUESTIONS]
    return get_questions_for_listing(position.listing_id, db)

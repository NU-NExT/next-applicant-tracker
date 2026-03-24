from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.models import JobListing, QuestionnaireQuestion, QuestionType

router = APIRouter(prefix="/api/repository", tags=["repository"])

FALLBACK_QUESTIONS = [
    "Tell us about your relevant experience for this role.",
    "Describe a project where you collaborated with a team under deadlines.",
    "What interests you about working with NExT Consulting?",
]


def _serialize_question(question: QuestionnaireQuestion, question_type_code: str) -> dict:
    return {
        "prompt": question.prompt,
        "question_type": question_type_code,
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
        return [{"prompt": q, "question_type": "free_text"} for q in FALLBACK_QUESTIONS]
    question_type_ids = {question.question_type_id for question in questions}
    question_type_lookup = {
        question_type.question_type_id: question_type.code
        for question_type in db.query(QuestionType).filter(QuestionType.question_type_id.in_(question_type_ids)).all()
    }
    return [_serialize_question(q, question_type_lookup.get(q.question_type_id, "free_text")) for q in questions]


@router.get("/by-position/{position_code}/questions", response_model=list[dict])
def get_questions_for_position_code(position_code: str, db: Session = Depends(get_db)) -> list[dict]:
    position = db.query(JobListing).filter(JobListing.code_id == position_code.strip().upper()).first()
    if not position:
        return [{"prompt": q, "question_type": "free_text"} for q in FALLBACK_QUESTIONS]
    return get_questions_for_listing(position.listing_id, db)

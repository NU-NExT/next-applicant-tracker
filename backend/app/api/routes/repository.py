from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.models import JobListing, JobListingQuestion, QuestionnaireQuestion

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
    # Global questions selected for this position via junction table
    global_questions = (
        db.query(QuestionnaireQuestion)
        .join(JobListingQuestion, JobListingQuestion.question_id == QuestionnaireQuestion.question_id)
        .filter(
            JobListingQuestion.job_listing_id == job_listing_id,
            QuestionnaireQuestion.is_global == True,  # noqa: E712
        )
        .order_by(JobListingQuestion.sequence_number)
        .all()
    )

    # Position-specific questions
    position_questions = (
        db.query(QuestionnaireQuestion)
        .filter(
            QuestionnaireQuestion.job_listing_id == job_listing_id,
            QuestionnaireQuestion.is_global == False,  # noqa: E712
        )
        .order_by(QuestionnaireQuestion.sort_order, QuestionnaireQuestion.question_id)
        .all()
    )

    questions = global_questions + position_questions
    if not questions:
        return [{"prompt": q, "question_type_id": None} for q in FALLBACK_QUESTIONS]
    return [_serialize_question(q) for q in questions]


@router.get("/by-slug/{listing_slug}/questions", response_model=list[dict])
def get_questions_for_listing_slug(listing_slug: str, db: Session = Depends(get_db)) -> list[dict]:
    position = db.query(JobListing).filter(JobListing.listing_slug == listing_slug.strip().lower()).first()
    if not position:
        return [{"prompt": q, "question_type_id": None} for q in FALLBACK_QUESTIONS]
    return get_questions_for_listing(position.listing_id, db)


@router.get("/by-position/{position_code}/questions", response_model=list[dict])
def get_questions_for_position_code(position_code: str, db: Session = Depends(get_db)) -> list[dict]:
    position = db.query(JobListing).filter(JobListing.code_id == position_code.strip().upper()).first()
    if not position:
        return [{"prompt": q, "question_type_id": None} for q in FALLBACK_QUESTIONS]
    return get_questions_for_listing(position.listing_id, db)

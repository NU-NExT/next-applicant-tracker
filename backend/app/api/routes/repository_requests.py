from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas import ApplicationSubmissionCreate, ApplicationSubmissionRead
from app.db import get_db
from app.models.models import ApplicationSubmission, JobListing

router = APIRouter(prefix="/api/repository-requests", tags=["repository-requests"])


@router.get("", response_model=list[ApplicationSubmissionRead])
def list_repository_requests(db: Session = Depends(get_db)) -> list[ApplicationSubmission]:
    return db.query(ApplicationSubmission).order_by(ApplicationSubmission.created_at.desc()).all()


@router.post("", response_model=ApplicationSubmissionRead, status_code=status.HTTP_201_CREATED)
def create_repository_request(
    payload: ApplicationSubmissionCreate, db: Session = Depends(get_db)
) -> ApplicationSubmission:
    job_listing = db.query(JobListing).filter(JobListing.id == payload.job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")

    submission = ApplicationSubmission(
        **payload.model_dump(),
        created_at=datetime.utcnow(),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission

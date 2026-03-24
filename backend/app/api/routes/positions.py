from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas import JobListingCreate, JobListingRead, JobListingUpdate
from app.db import get_db
from app.models.models import JobListing, QuestionnaireQuestion

router = APIRouter(prefix="/api/positions", tags=["positions"])


@router.get("", response_model=list[JobListingRead])
def list_positions(db: Session = Depends(get_db)) -> list[JobListing]:
    return db.query(JobListing).order_by(JobListing.date_created.desc()).all()


@router.get("/{position_id}", response_model=JobListingRead)
def get_position(position_id: int, db: Session = Depends(get_db)) -> JobListing:
    position = db.query(JobListing).filter(JobListing.id == position_id).first()
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return position


@router.get("/code/{position_code}", response_model=JobListingRead)
def get_position_by_code(position_code: str, db: Session = Depends(get_db)) -> JobListing:
    code = position_code.strip().upper()
    position = db.query(JobListing).filter(JobListing.code_id == code).first()
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return position


@router.post("", response_model=JobListingRead, status_code=status.HTTP_201_CREATED)
def create_position(payload: JobListingCreate, db: Session = Depends(get_db)) -> JobListing:
    from app.api.routes.job_listings import create_job_listing

    return create_job_listing(payload, db)


@router.patch("/{position_id}", response_model=JobListingRead)
def patch_position(position_id: int, payload: JobListingUpdate, db: Session = Depends(get_db)) -> JobListing:
    from app.api.routes.job_listings import patch_job_listing

    return patch_job_listing(position_id, payload, db)


@router.delete("/{position_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_position(position_id: int, db: Session = Depends(get_db)) -> None:
    position = db.query(JobListing).filter(JobListing.id == position_id).first()
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == position.id).delete()
    db.delete(position)
    db.commit()

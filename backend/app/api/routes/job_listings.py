from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas import JobListingCreate, JobListingRead, JobListingUpdate
from app.db import get_db
from app.models.models import JobListing, QuestionnaireQuestion

router = APIRouter(prefix="/api/job-listings", tags=["job-listings"])


@router.get("", response_model=list[JobListingRead])
def list_job_listings(db: Session = Depends(get_db)) -> list[JobListing]:
    return db.query(JobListing).order_by(JobListing.date_created.desc()).all()


@router.get("/{job_listing_id}", response_model=JobListingRead)
def get_job_listing(job_listing_id: int, db: Session = Depends(get_db)) -> JobListing:
    job_listing = db.query(JobListing).filter(JobListing.id == job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    return job_listing


@router.post("", response_model=JobListingRead, status_code=status.HTTP_201_CREATED)
def create_job_listing(payload: JobListingCreate, db: Session = Depends(get_db)) -> JobListing:
    payload_dict = payload.model_dump()
    question_payloads = payload_dict.pop("questions", [])
    if payload_dict.get("date_created") is None:
        payload_dict.pop("date_created", None)

    job_listing = JobListing(**payload_dict)
    db.add(job_listing)
    db.flush()

    for question in question_payloads:
        db.add(
            QuestionnaireQuestion(
                job_listing_id=job_listing.id,
                prompt=question["prompt"],
                sort_order=question.get("sort_order", 0),
            )
        )

    db.commit()
    db.refresh(job_listing)
    return job_listing


@router.put("/{job_listing_id}", response_model=JobListingRead)
def update_job_listing(job_listing_id: int, payload: JobListingCreate, db: Session = Depends(get_db)) -> JobListing:
    job_listing = db.query(JobListing).filter(JobListing.id == job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")

    payload_dict = payload.model_dump()
    question_payloads = payload_dict.pop("questions", [])
    if payload_dict.get("date_created") is None:
        payload_dict.pop("date_created", None)

    for key, value in payload_dict.items():
        setattr(job_listing, key, value)

    db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == job_listing.id).delete()
    for question in question_payloads:
        db.add(
            QuestionnaireQuestion(
                job_listing_id=job_listing.id,
                prompt=question["prompt"],
                sort_order=question.get("sort_order", 0),
            )
        )

    db.commit()
    db.refresh(job_listing)
    return job_listing


@router.patch("/{job_listing_id}", response_model=JobListingRead)
def patch_job_listing(job_listing_id: int, payload: JobListingUpdate, db: Session = Depends(get_db)) -> JobListing:
    job_listing = db.query(JobListing).filter(JobListing.id == job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")

    payload_dict = payload.model_dump(exclude_unset=True)
    question_payloads = payload_dict.pop("questions", None)

    for key, value in payload_dict.items():
        setattr(job_listing, key, value)

    if question_payloads is not None:
        db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == job_listing.id).delete()
        for question in question_payloads:
            db.add(
                QuestionnaireQuestion(
                    job_listing_id=job_listing.id,
                    prompt=question["prompt"],
                    sort_order=question.get("sort_order", 0),
                )
            )

    db.commit()
    db.refresh(job_listing)
    return job_listing


@router.delete("/{job_listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_listing(job_listing_id: int, db: Session = Depends(get_db)) -> None:
    job_listing = db.query(JobListing).filter(JobListing.id == job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")

    db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == job_listing.id).delete()
    db.delete(job_listing)
    db.commit()

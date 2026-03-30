from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas import JobListingCreate, JobListingRead, JobListingUpdate
from app.db import get_db
from app.models.models import JobListing, QuestionnaireQuestion

router = APIRouter(prefix="/api/job-listings", tags=["job-listings"])


def _normalize_position_fields(payload_dict: dict) -> None:
    title = (payload_dict.get("position_title") or payload_dict.get("job") or "").strip()
    if not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="position_title is required")
    payload_dict["position_title"] = title
    payload_dict["job"] = title


def _map_job_listing_payload(payload_dict: dict) -> dict:
    mapped = dict(payload_dict)
    if "date_created" in mapped:
        value = mapped.pop("date_created")
        if value is not None:
            mapped["listing_date_created"] = value
    if "date_end" in mapped:
        mapped["listing_date_end"] = mapped.pop("date_end")
    if "slug" in mapped:
        mapped["listing_slug"] = mapped.pop("slug")
    if "code_id" in mapped and mapped["code_id"] is not None:
        code = str(mapped["code_id"]).strip().upper()
        mapped["code_id"] = code or None
    return mapped


def _generate_code_id() -> str:
    return f"POS-{uuid4().hex[:8].upper()}"


def _ensure_unique_code_id(db: Session, preferred_code: str | None) -> str:
    if preferred_code:
        code = preferred_code.strip().upper()
        if code:
            exists = db.query(JobListing).filter(JobListing.code_id == code).first()
            if exists:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="code_id already exists")
            return code
    while True:
        generated = _generate_code_id()
        exists = db.query(JobListing).filter(JobListing.code_id == generated).first()
        if not exists:
            return generated


@router.get("", response_model=list[JobListingRead])
def list_job_listings(db: Session = Depends(get_db)) -> list[JobListing]:
    return db.query(JobListing).order_by(JobListing.listing_date_created.desc()).all()


@router.get("/{job_listing_id}", response_model=JobListingRead)
def get_job_listing(job_listing_id: int, db: Session = Depends(get_db)) -> JobListing:
    job_listing = db.query(JobListing).filter(JobListing.listing_id == job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    return job_listing


@router.post("", response_model=JobListingRead, status_code=status.HTTP_201_CREATED)
def create_job_listing(payload: JobListingCreate, db: Session = Depends(get_db)) -> JobListing:
    payload_dict = _map_job_listing_payload(payload.model_dump())
    question_payloads = payload_dict.pop("questions", [])
    if payload_dict.get("listing_date_created") is None:
        payload_dict.pop("listing_date_created", None)
    _normalize_position_fields(payload_dict)
    code_id = _ensure_unique_code_id(db, payload_dict.get("code_id"))
    payload_dict["code_id"] = code_id

    job_listing = JobListing(**payload_dict)
    db.add(job_listing)
    db.flush()

    for question in question_payloads:
        db.add(
            QuestionnaireQuestion(
                job_listing_id=job_listing.listing_id,
                prompt=question["prompt"],
                sort_order=question.get("sort_order", 0),
                question_type_id=question["question_type_id"],
                character_limit=question.get("character_limit"),
                is_global=question.get("is_global", False),
            )
        )

    db.commit()
    db.refresh(job_listing)
    return job_listing


@router.put("/{job_listing_id}", response_model=JobListingRead)
def update_job_listing(job_listing_id: int, payload: JobListingCreate, db: Session = Depends(get_db)) -> JobListing:
    job_listing = db.query(JobListing).filter(JobListing.listing_id == job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")

    payload_dict = _map_job_listing_payload(payload.model_dump())
    question_payloads = payload_dict.pop("questions", [])
    if payload_dict.get("listing_date_created") is None:
        payload_dict.pop("listing_date_created", None)
    _normalize_position_fields(payload_dict)
    payload_dict["code_id"] = job_listing.code_id

    for key, value in payload_dict.items():
        setattr(job_listing, key, value)

    db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == job_listing.listing_id).delete()
    for question in question_payloads:
        db.add(
            QuestionnaireQuestion(
                job_listing_id=job_listing.listing_id,
                prompt=question["prompt"],
                sort_order=question.get("sort_order", 0),
                question_type_id=question["question_type_id"],
                character_limit=question.get("character_limit"),
                is_global=question.get("is_global", False),
            )
        )

    db.commit()
    db.refresh(job_listing)
    return job_listing


@router.patch("/{job_listing_id}", response_model=JobListingRead)
def patch_job_listing(job_listing_id: int, payload: JobListingUpdate, db: Session = Depends(get_db)) -> JobListing:
    job_listing = db.query(JobListing).filter(JobListing.listing_id == job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")

    payload_dict = _map_job_listing_payload(payload.model_dump(exclude_unset=True))
    question_payloads = payload_dict.pop("questions", None)

    if "position_title" in payload_dict or "job" in payload_dict:
        _normalize_position_fields(payload_dict)
    if "code_id" in payload_dict:
        payload_dict["code_id"] = job_listing.code_id

    for key, value in payload_dict.items():
        setattr(job_listing, key, value)

    if question_payloads is not None:
        db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == job_listing.listing_id).delete()
        for question in question_payloads:
            db.add(
                QuestionnaireQuestion(
                    job_listing_id=job_listing.listing_id,
                    prompt=question["prompt"],
                    sort_order=question.get("sort_order", 0),
                    question_type_id=question["question_type_id"],
                    character_limit=question.get("character_limit"),
                    is_global=question.get("is_global", False),
                )
            )

    db.commit()
    db.refresh(job_listing)
    return job_listing


@router.delete("/{job_listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_listing(job_listing_id: int, db: Session = Depends(get_db)) -> None:
    job_listing = db.query(JobListing).filter(JobListing.listing_id == job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")

    db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == job_listing.listing_id).delete()
    db.delete(job_listing)
    db.commit()


@router.get("/by-position-code/{position_code}", response_model=JobListingRead)
def get_job_listing_by_position_code(position_code: str, db: Session = Depends(get_db)) -> JobListing:
    normalized = position_code.strip().upper()
    job_listing = db.query(JobListing).filter(JobListing.code_id == normalized).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return job_listing

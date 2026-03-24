import re
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


def _generate_position_code() -> str:
    return f"POS-{uuid4().hex[:8].upper()}"


def _ensure_unique_position_code(db: Session, preferred_code: str | None) -> str:
    if preferred_code:
        code = preferred_code.strip().upper()
        if code:
            exists = db.query(JobListing).filter(JobListing.code_id == code).first()
            if exists:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="code_id already exists")
            return code
    while True:
        generated = _generate_position_code()
        exists = db.query(JobListing).filter(JobListing.code_id == generated).first()
        if not exists:
            return generated


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or f"listing-{uuid4().hex[:8]}"


def _ensure_unique_listing_slug(db: Session, preferred_slug: str | None, title: str) -> str:
    base_slug = _slugify(preferred_slug or title)
    slug = base_slug
    counter = 2
    while db.query(JobListing).filter(JobListing.listing_slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def _normalize_listing_payload(payload_dict: dict, *, db: Session, existing: JobListing | None = None) -> None:
    if payload_dict.get("date_created") is None:
        payload_dict.pop("date_created", None)
    if "date_created" in payload_dict:
        payload_dict["listing_date_created"] = payload_dict.pop("date_created")
    if "date_end" in payload_dict:
        payload_dict["listing_date_end"] = payload_dict.pop("date_end")
    if "slug" in payload_dict:
        payload_dict["listing_slug"] = payload_dict.pop("slug")

    code_id = payload_dict.pop("position_code", None)
    if "code_id" not in payload_dict:
        payload_dict["code_id"] = existing.code_id if existing and existing.code_id else _ensure_unique_position_code(db, code_id)
    elif payload_dict["code_id"] is None:
        payload_dict["code_id"] = existing.code_id if existing else _ensure_unique_position_code(db, None)

    preferred_slug = payload_dict.get("listing_slug")
    if preferred_slug is None:
        preferred_slug = existing.listing_slug if existing else None
    if preferred_slug is None or (existing is None and preferred_slug):
        payload_dict["listing_slug"] = _ensure_unique_listing_slug(db, preferred_slug, payload_dict["position_title"])

    payload_dict.pop("candidate_intake_url", None)


def _add_questions(db: Session, question_payloads: list[dict], job_listing_id: int) -> None:
    for question in question_payloads:
        db.add(
            QuestionnaireQuestion(
                job_listing_id=job_listing_id,
                prompt=question["prompt"],
                sort_order=question.get("sort_order", 0),
                question_type_id=question["question_type_id"],
                character_limit=question.get("character_limit"),
                is_global=question.get("is_global", False),
            )
        )


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
    _normalize_position_fields(payload_dict)
    _normalize_listing_payload(payload_dict, db=db)

    job_listing = JobListing(**payload_dict)
    db.add(job_listing)
    db.flush()

    _add_questions(db, question_payloads, job_listing.listing_id)

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
    _normalize_position_fields(payload_dict)
    _normalize_listing_payload(payload_dict, db=db, existing=job_listing)

    for key, value in payload_dict.items():
        setattr(job_listing, key, value)

    db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == job_listing.listing_id).delete()
    _add_questions(db, question_payloads, job_listing.listing_id)

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

    if "position_title" in payload_dict or "job" in payload_dict:
        _normalize_position_fields(payload_dict)
    _normalize_listing_payload(payload_dict, db=db, existing=job_listing)

    for key, value in payload_dict.items():
        setattr(job_listing, key, value)

    if question_payloads is not None:
        db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == job_listing.listing_id).delete()
        _add_questions(db, question_payloads, job_listing.listing_id)

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


@router.get("/by-position-code/{position_code}", response_model=JobListingRead)
def get_job_listing_by_position_code(position_code: str, db: Session = Depends(get_db)) -> JobListing:
    normalized = position_code.strip().upper()
    job_listing = db.query(JobListing).filter(JobListing.code_id == normalized).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return job_listing

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.authn import ensure_admin_user, require_bearer_token
from app.api.schemas import (
    ApplicationCycleRead,
    GlobalQuestionBankRead,
    GlobalQuestionSelectionPayload,
    JobListingAdminCreate,
    JobListingAdminRead,
    JobListingAdminUpdate,
    JobListingCreate,
    JobListingRead,
    JobListingUpdate,
    PublicJobListingDetail,
    PublicJobListingSummary,
    PositionQuestionCreate,
    PositionQuestionRead,
    PositionQuestionReorder,
    PositionQuestionUpdate,
)
from app.config import settings
from app.db import get_db
from app.models.models import (
    ApplicationCycle,
    ApplicationSubmission,
    JobListing,
    JobListingQuestion,
    QuestionnaireQuestion,
    QuestionType,
)

router = APIRouter(prefix="/api/job-listings", tags=["job-listings"])
_SLUG_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")


def _assert_admin(authorization: str | None, db: Session) -> None:
    token = require_bearer_token(authorization)
    ensure_admin_user(db, token)


def _build_admin_read(listing: JobListing, db: Session) -> JobListingAdminRead:
    description_text = _extract_description_text(listing.description)
    cycle_slug: str | None = None
    if listing.application_cycle_id is not None:
        cycle_row = (
            db.query(ApplicationCycle.slug)
            .filter(ApplicationCycle.application_cycle_id == listing.application_cycle_id)
            .first()
        )
        cycle_slug = cycle_row.slug if cycle_row else None
    position_slug = _slugify(listing.position_title)
    intake_path = f"/jobs/{cycle_slug}/{position_slug}" if cycle_slug and position_slug else f"/jobs/{listing.listing_slug}"
    application_count = (
        db.query(ApplicationSubmission)
        .filter(ApplicationSubmission.job_listing_id == listing.listing_id)
        .count()
    )
    question_count = (
        db.query(QuestionnaireQuestion)
        .filter(
            QuestionnaireQuestion.job_listing_id == listing.listing_id,
            QuestionnaireQuestion.is_global == False,  # noqa: E712
        )
        .count()
    )
    return JobListingAdminRead(
        listing_id=listing.listing_id,
        listing_slug=listing.listing_slug,
        code_id=listing.code_id,
        position_title=listing.position_title,
        description=description_text,
        required_skills=listing.required_skills,
        application_cycle_id=listing.application_cycle_id,
        target_start_date=listing.target_start_date,
        listing_date_posted=listing.listing_date_posted,
        listing_date_end=listing.listing_date_end,
        nuworks_url=listing.nuworks_url,
        nuworks_position_id=listing.nuworks_position_id,
        is_active=listing.is_active,
        listing_date_created=listing.listing_date_created,
        intake_url=f"{settings.frontend_url}{intake_path}",
        application_count=application_count,
        question_count=question_count,
    )


def _extract_description_text(description: object) -> str:
    if isinstance(description, dict):
        return str(description.get("text", "") or "")
    return str(description or "")


def _get_cycle_slug_map(db: Session) -> dict[int, str]:
    rows = db.query(ApplicationCycle.application_cycle_id, ApplicationCycle.slug).all()
    return {row.application_cycle_id: row.slug for row in rows}


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
    if "date_posted" in mapped:
        mapped["listing_date_posted"] = mapped.pop("date_posted")
    if "slug" in mapped:
        mapped["listing_slug"] = mapped.pop("slug")
    if "code_id" in mapped and mapped["code_id"] is not None:
        code = str(mapped["code_id"]).strip().upper()
        mapped["code_id"] = code or None
    return mapped


def _slugify(value: str) -> str:
    return _SLUG_NON_ALNUM_RE.sub("-", value.strip().lower()).strip("-")


def _normalize_or_400_slug(raw_slug: str) -> str:
    slug = _slugify(raw_slug)
    if not slug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid slug")
    return slug


def _ensure_unique_code_id(db: Session, preferred_code: str | None) -> str | None:
    if not preferred_code:
        return None
    code = preferred_code.strip().upper()
    if not code:
        return None
    exists = db.query(JobListing).filter(JobListing.code_id == code).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="code_id already exists")
    return code


def _build_listing_slug_base(position_title: str, cycle_slug: str | None) -> str:
    _ = cycle_slug
    title_slug = _slugify(position_title)
    if title_slug:
        return title_slug
    return "position"


def _ensure_unique_listing_slug(db: Session, base_slug: str, *, exclude_listing_id: int | None = None) -> str:
    candidate = base_slug
    suffix = 2
    while True:
        query = db.query(JobListing).filter(JobListing.listing_slug == candidate)
        if exclude_listing_id is not None:
            query = query.filter(JobListing.listing_id != exclude_listing_id)
        if query.first() is None:
            return candidate
        candidate = f"{base_slug}-{suffix}"
        suffix += 1


def _generate_listing_slug(db: Session, position_title: str, application_cycle_id: int | None) -> str:
    _ = application_cycle_id
    base_slug = _build_listing_slug_base(position_title, None)
    return _ensure_unique_listing_slug(db, base_slug)


def _get_listing_or_404(listing_id: int, db: Session) -> JobListing:
    listing = db.query(JobListing).filter(JobListing.listing_id == listing_id).first()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    return listing


def _get_question_or_404(listing_id: int, question_id: int, db: Session) -> QuestionnaireQuestion:
    q = db.query(QuestionnaireQuestion).filter(
        QuestionnaireQuestion.question_id == question_id,
        QuestionnaireQuestion.job_listing_id == listing_id,
    ).first()
    if q is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return q


def _validate_application_cycle_id(application_cycle_id: int | None, db: Session) -> None:
    if application_cycle_id is None:
        return
    exists = (
        db.query(ApplicationCycle.application_cycle_id)
        .filter(ApplicationCycle.application_cycle_id == application_cycle_id)
        .first()
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid application_cycle_id",
        )


@router.get("/admin/{listing_id}/questions", response_model=list[PositionQuestionRead])
def list_position_questions(
    listing_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[QuestionnaireQuestion]:
    _assert_admin(authorization, db)
    _get_listing_or_404(listing_id, db)
    return (
        db.query(QuestionnaireQuestion)
        .filter(
            QuestionnaireQuestion.job_listing_id == listing_id,
            QuestionnaireQuestion.is_global == False,  # noqa: E712
        )
        .order_by(QuestionnaireQuestion.sort_order)
        .all()
    )


@router.post("/admin/{listing_id}/questions", response_model=PositionQuestionRead, status_code=status.HTTP_201_CREATED)
def create_position_question(
    listing_id: int,
    payload: PositionQuestionCreate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> QuestionnaireQuestion:
    _assert_admin(authorization, db)
    _get_listing_or_404(listing_id, db)
    free_text_type = db.query(QuestionType).filter(QuestionType.code == "free_text").first()
    question_type_id = free_text_type.question_type_id if free_text_type else 1
    max_order = (
        db.query(func.max(QuestionnaireQuestion.sort_order))
        .filter(QuestionnaireQuestion.job_listing_id == listing_id)
        .scalar()
    )
    next_order = (max_order + 1) if max_order is not None else 0
    q = QuestionnaireQuestion(
        job_listing_id=listing_id,
        prompt=payload.prompt.strip(),
        sort_order=next_order,
        question_type_id=question_type_id,
        character_limit=payload.character_limit,
        is_global=False,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.patch("/admin/{listing_id}/questions/reorder", response_model=list[PositionQuestionRead])
def reorder_position_questions(
    listing_id: int,
    payload: PositionQuestionReorder,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[QuestionnaireQuestion]:
    _assert_admin(authorization, db)
    _get_listing_or_404(listing_id, db)
    question_map = {
        q.question_id: q
        for q in db.query(QuestionnaireQuestion)
        .filter(
            QuestionnaireQuestion.job_listing_id == listing_id,
            QuestionnaireQuestion.is_global == False,  # noqa: E712
        )
        .all()
    }
    if set(payload.question_ids) != set(question_map.keys()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="question_ids must match exactly the questions for this position",
        )
    for idx, qid in enumerate(payload.question_ids):
        question_map[qid].sort_order = idx
    db.commit()
    return sorted(question_map.values(), key=lambda q: q.sort_order)


@router.patch("/admin/{listing_id}/questions/{question_id}", response_model=PositionQuestionRead)
def update_position_question(
    listing_id: int,
    question_id: int,
    payload: PositionQuestionUpdate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> QuestionnaireQuestion:
    _assert_admin(authorization, db)
    q = _get_question_or_404(listing_id, question_id, db)
    updates = payload.model_dump(exclude_unset=True)  # exclude_unset so null explicitly clears
    if "prompt" in updates:
        q.prompt = updates["prompt"].strip()
    if "character_limit" in updates:
        q.character_limit = updates["character_limit"]  # None is valid — clears the limit
    db.commit()
    db.refresh(q)
    return q


@router.delete("/admin/{listing_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_position_question(
    listing_id: int,
    question_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> None:
    _assert_admin(authorization, db)
    q = _get_question_or_404(listing_id, question_id, db)
    db.delete(q)
    db.flush()
    remaining = (
        db.query(QuestionnaireQuestion)
        .filter(
            QuestionnaireQuestion.job_listing_id == listing_id,
            QuestionnaireQuestion.is_global == False,  # noqa: E712
        )
        .order_by(QuestionnaireQuestion.sort_order)
        .all()
    )
    for idx, rq in enumerate(remaining):
        rq.sort_order = idx
    db.commit()


@router.get("/admin/global-questions", response_model=list[GlobalQuestionBankRead])
def list_global_questions(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[QuestionnaireQuestion]:
    _assert_admin(authorization, db)
    return (
        db.query(QuestionnaireQuestion)
        .filter(QuestionnaireQuestion.is_global == True)  # noqa: E712
        .order_by(QuestionnaireQuestion.sort_order, QuestionnaireQuestion.question_id)
        .all()
    )


@router.get("/admin/{listing_id}/global-questions", response_model=list[GlobalQuestionBankRead])
def list_position_global_questions(
    listing_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[dict]:
    _assert_admin(authorization, db)
    _get_listing_or_404(listing_id, db)
    rows = (
        db.query(QuestionnaireQuestion)
        .join(JobListingQuestion, JobListingQuestion.question_id == QuestionnaireQuestion.question_id)
        .filter(
            JobListingQuestion.job_listing_id == listing_id,
            QuestionnaireQuestion.is_global == True,  # noqa: E712
        )
        .order_by(JobListingQuestion.sequence_number)
        .all()
    )
    return rows


@router.put("/admin/{listing_id}/global-questions", response_model=list[GlobalQuestionBankRead])
def set_position_global_questions(
    listing_id: int,
    payload: GlobalQuestionSelectionPayload,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[QuestionnaireQuestion]:
    _assert_admin(authorization, db)
    _get_listing_or_404(listing_id, db)

    if payload.question_ids:
        global_questions = (
            db.query(QuestionnaireQuestion)
            .filter(
                QuestionnaireQuestion.question_id.in_(payload.question_ids),
                QuestionnaireQuestion.is_global == True,  # noqa: E712
            )
            .all()
        )
        found_ids = {q.question_id for q in global_questions}
        missing = set(payload.question_ids) - found_ids
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question IDs not found or not global: {sorted(missing)}",
            )

    # Delete existing global question associations for this listing
    existing = (
        db.query(JobListingQuestion)
        .join(QuestionnaireQuestion, JobListingQuestion.question_id == QuestionnaireQuestion.question_id)
        .filter(
            JobListingQuestion.job_listing_id == listing_id,
            QuestionnaireQuestion.is_global == True,  # noqa: E712
        )
        .all()
    )
    for row in existing:
        db.delete(row)

    # Insert new associations
    for idx, qid in enumerate(payload.question_ids):
        db.add(JobListingQuestion(
            job_listing_id=listing_id,
            question_id=qid,
            sequence_number=idx,
        ))

    db.commit()

    # Return the newly associated global questions
    return (
        db.query(QuestionnaireQuestion)
        .join(JobListingQuestion, JobListingQuestion.question_id == QuestionnaireQuestion.question_id)
        .filter(
            JobListingQuestion.job_listing_id == listing_id,
            QuestionnaireQuestion.is_global == True,  # noqa: E712
        )
        .order_by(JobListingQuestion.sequence_number)
        .all()
    )


@router.get("/admin", response_model=list[JobListingAdminRead])
def list_admin_job_listings(
    is_active: bool | None = None,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[JobListingAdminRead]:
    _assert_admin(authorization, db)
    q = db.query(JobListing)
    if is_active is not None:
        q = q.filter(JobListing.is_active == is_active)
    listings = q.order_by(JobListing.listing_date_created.desc()).all()
    return [_build_admin_read(listing, db) for listing in listings]


@router.get("/admin/application-cycles", response_model=list[ApplicationCycleRead])
def list_application_cycles(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[ApplicationCycle]:
    _assert_admin(authorization, db)
    rows = (
        db.query(
            ApplicationCycle.application_cycle_id,
            ApplicationCycle.name,
            ApplicationCycle.slug,
        )
        .order_by(ApplicationCycle.name.asc())
        .all()
    )
    return [
        ApplicationCycleRead(
            application_cycle_id=row.application_cycle_id,
            name=row.name,
            slug=row.slug,
        )
        for row in rows
    ]


@router.get("/admin/{job_listing_id}", response_model=JobListingAdminRead)
def get_admin_job_listing(
    job_listing_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> JobListingAdminRead:
    _assert_admin(authorization, db)
    listing = db.query(JobListing).filter(JobListing.listing_id == job_listing_id).first()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    return _build_admin_read(listing, db)


@router.post("/admin", response_model=JobListingAdminRead, status_code=status.HTTP_201_CREATED)
def create_admin_job_listing(
    payload: JobListingAdminCreate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> JobListingAdminRead:
    _assert_admin(authorization, db)
    _validate_application_cycle_id(payload.application_cycle_id, db)
    position_title = payload.position_title.strip()
    listing_slug = _generate_listing_slug(db, position_title, payload.application_cycle_id)
    listing = JobListing(
        position_title=position_title,
        job=position_title,  # legacy column mirroring position_title; keep in sync
        code_id=None,
        description={"text": payload.description},
        required_skills=payload.required_skills or None,
        application_cycle_id=payload.application_cycle_id,
        target_start_date=payload.target_start_date,
        listing_date_posted=payload.listing_date_posted or datetime.now(timezone.utc),
        listing_date_end=payload.listing_date_end,
        nuworks_url=payload.nuworks_url,
        nuworks_position_id=payload.nuworks_position_id,
        listing_slug=listing_slug,
        is_active=True,
    )
    db.add(listing)
    db.flush()

    # Associate selected global questions via junction table
    for idx, qid in enumerate(payload.global_question_ids):
        db.add(JobListingQuestion(
            job_listing_id=listing.listing_id,
            question_id=qid,
            sequence_number=idx,
        ))

    db.commit()
    db.refresh(listing)
    return _build_admin_read(listing, db)


@router.patch("/admin/{job_listing_id}", response_model=JobListingAdminRead)
def patch_admin_job_listing(
    job_listing_id: int,
    payload: JobListingAdminUpdate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> JobListingAdminRead:
    _assert_admin(authorization, db)
    listing = db.query(JobListing).filter(JobListing.listing_id == job_listing_id).first()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    updates = payload.model_dump(exclude_unset=True)
    if "application_cycle_id" in updates:
        _validate_application_cycle_id(updates["application_cycle_id"], db)
    if "position_title" in updates:
        title = updates.pop("position_title").strip()
        listing.position_title = title
        listing.job = title  # keep legacy mirror in sync
    if "description" in updates:
        listing.description = {"text": updates.pop("description")}
    for key, value in updates.items():
        setattr(listing, key, value)
    db.commit()
    db.refresh(listing)
    return _build_admin_read(listing, db)


@router.patch("/admin/{job_listing_id}/deactivate", response_model=JobListingAdminRead)
def deactivate_job_listing(
    job_listing_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> JobListingAdminRead:
    _assert_admin(authorization, db)
    listing = db.query(JobListing).filter(JobListing.listing_id == job_listing_id).first()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    listing.is_active = False
    db.commit()
    db.refresh(listing)
    return _build_admin_read(listing, db)


@router.get("", response_model=list[JobListingRead])
def list_job_listings(db: Session = Depends(get_db)) -> list[JobListing]:
    return (
        db.query(JobListing)
        .filter(
            JobListing.is_active == True,  # noqa: E712
            JobListing.listing_date_posted.isnot(None),
            JobListing.listing_date_posted <= func.now(),
        )
        .order_by(JobListing.listing_date_posted.desc(), JobListing.listing_date_created.desc())
        .all()
    )


@router.get("/public", response_model=list[PublicJobListingSummary])
def list_public_job_listings(db: Session = Depends(get_db)) -> list[PublicJobListingSummary]:
    cycle_slug_map = _get_cycle_slug_map(db)
    listings = db.query(JobListing).filter(JobListing.is_active == True).order_by(JobListing.listing_date_created.desc()).all()
    return [
        PublicJobListingSummary(
            listing_id=listing.listing_id,
            listing_slug=listing.listing_slug,
            cycle_slug=cycle_slug_map.get(listing.application_cycle_id) if listing.application_cycle_id is not None else None,
            position_title=listing.position_title,
            description=_extract_description_text(listing.description),
            target_start_date=listing.target_start_date,
        )
        for listing in listings
    ]


@router.get("/public/by-cycle-title", response_model=PublicJobListingDetail)
def get_public_job_listing_by_cycle_and_title(
    cycle: str = Query(..., min_length=1),
    title: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> PublicJobListingDetail:
    normalized_cycle = _slugify(cycle)
    normalized_title_key = _slugify(title)
    if not normalized_title_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid title")
    candidates = (
        db.query(JobListing)
        .join(ApplicationCycle, JobListing.application_cycle_id == ApplicationCycle.application_cycle_id)
        .filter(
            JobListing.is_active == True,  # noqa: E712
            ApplicationCycle.slug == normalized_cycle,
        )
        .all()
    )
    listing = next((row for row in candidates if _slugify(row.position_title) == normalized_title_key), None)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return PublicJobListingDetail(
        listing_id=listing.listing_id,
        listing_slug=listing.listing_slug,
        cycle_slug=normalized_cycle,
        position_title=listing.position_title,
        description=_extract_description_text(listing.description),
        target_start_date=listing.target_start_date,
        listing_date_end=listing.listing_date_end,
        required_skills=listing.required_skills,
    )


@router.get("/public/{listing_slug}", response_model=PublicJobListingDetail)
def get_public_job_listing_by_slug(listing_slug: str, db: Session = Depends(get_db)) -> PublicJobListingDetail:
    cycle_slug_map = _get_cycle_slug_map(db)
    normalized = _normalize_or_400_slug(listing_slug)
    listing = db.query(JobListing).filter(JobListing.listing_slug == normalized, JobListing.is_active == True).first()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return PublicJobListingDetail(
        listing_id=listing.listing_id,
        listing_slug=listing.listing_slug,
        cycle_slug=cycle_slug_map.get(listing.application_cycle_id) if listing.application_cycle_id is not None else None,
        position_title=listing.position_title,
        description=_extract_description_text(listing.description),
        target_start_date=listing.target_start_date,
        listing_date_end=listing.listing_date_end,
        required_skills=listing.required_skills,
    )


@router.post("", response_model=JobListingRead, status_code=status.HTTP_201_CREATED)
def create_job_listing(payload: JobListingCreate, db: Session = Depends(get_db)) -> JobListing:
    payload_dict = _map_job_listing_payload(payload.model_dump())
    question_payloads = payload_dict.pop("questions", [])
    global_question_ids = payload_dict.pop("global_question_ids", [])
    if payload_dict.get("listing_date_created") is None:
        payload_dict.pop("listing_date_created", None)
    _normalize_position_fields(payload_dict)
    payload_dict["code_id"] = _ensure_unique_code_id(db, payload_dict.get("code_id"))
    if payload_dict.get("listing_slug"):
        normalized_slug = _normalize_or_400_slug(str(payload_dict["listing_slug"]))
        payload_dict["listing_slug"] = _ensure_unique_listing_slug(db, normalized_slug)
    else:
        payload_dict["listing_slug"] = _generate_listing_slug(
            db,
            payload_dict["position_title"],
            payload_dict.get("application_cycle_id"),
        )

    job_listing = JobListing(**payload_dict)
    db.add(job_listing)
    db.flush()

    # Create position-specific questions only (skip any marked is_global)
    for question in question_payloads:
        if question.get("is_global", False):
            continue
        db.add(
            QuestionnaireQuestion(
                job_listing_id=job_listing.listing_id,
                prompt=question["prompt"],
                sort_order=question.get("sort_order", 0),
                question_type_id=question["question_type_id"],
                character_limit=question.get("character_limit"),
                is_global=False,
            )
        )

    # Associate selected global questions via junction table
    for idx, qid in enumerate(global_question_ids):
        db.add(JobListingQuestion(
            job_listing_id=job_listing.listing_id,
            question_id=qid,
            sequence_number=idx,
        ))

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
    payload_dict["listing_slug"] = job_listing.listing_slug

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
    if "listing_slug" in payload_dict:
        payload_dict["listing_slug"] = job_listing.listing_slug

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

    db.query(JobListingQuestion).filter(JobListingQuestion.job_listing_id == job_listing.listing_id).delete()
    db.query(QuestionnaireQuestion).filter(QuestionnaireQuestion.job_listing_id == job_listing.listing_id).delete()
    db.delete(job_listing)
    db.commit()


@router.get("/by-position-code/{position_code}")
def get_job_listing_by_position_code(position_code: str, db: Session = Depends(get_db)) -> dict:
    normalized = position_code.strip().upper()
    job_listing = db.query(JobListing).filter(JobListing.code_id == normalized).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return {"listing_id": job_listing.listing_id, "listing_slug": job_listing.listing_slug, "code_id": job_listing.code_id}


@router.get("/by-slug/{listing_slug}")
def get_job_listing_by_slug(listing_slug: str, db: Session = Depends(get_db)) -> dict:
    normalized = _normalize_or_400_slug(listing_slug)
    job_listing = db.query(JobListing).filter(JobListing.listing_slug == normalized).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return {"listing_id": job_listing.listing_id, "listing_slug": job_listing.listing_slug, "code_id": job_listing.code_id}


@router.get("/by-cycle-title")
def get_job_listing_by_cycle_and_title(
    cycle: str = Query(..., min_length=1),
    title: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> dict:
    normalized_cycle = _slugify(cycle)
    normalized_title_key = _slugify(title)
    if not normalized_title_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid title")
    if normalized_cycle == "uncategorized":
        candidates = (
            db.query(JobListing)
            .filter(
                JobListing.is_active == True,  # noqa: E712
                JobListing.application_cycle_id.is_(None),
            )
            .all()
        )
    else:
        candidates = (
            db.query(JobListing)
            .join(ApplicationCycle, JobListing.application_cycle_id == ApplicationCycle.application_cycle_id)
            .filter(
                JobListing.is_active == True,  # noqa: E712
                ApplicationCycle.slug == normalized_cycle,
            )
            .all()
        )
    job_listing = next((row for row in candidates if row.listing_slug == normalized_title_key), None)
    if job_listing is None:
        job_listing = next((row for row in candidates if _slugify(row.position_title) == normalized_title_key), None)
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return {
        "listing_id": job_listing.listing_id,
        "listing_slug": job_listing.listing_slug,
        "code_id": job_listing.code_id,
    }


@router.get("/{job_listing_id}", response_model=JobListingRead)
def get_job_listing(job_listing_id: int, db: Session = Depends(get_db)) -> JobListing:
    job_listing = db.query(JobListing).filter(JobListing.listing_id == job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    return job_listing

import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.authn import ensure_admin_user, get_or_create_user_from_access_token, merge_metadata, require_bearer_token
from app.api.schemas import ApplicationSubmissionCreate, ApplicationSubmissionRead, ApplicationSubmissionStatusUpdate
from app.config import settings
from app.db import get_db
from app.models.models import ApplicationSubmission, JobListing
from app.services.storage import storage_service

router = APIRouter(prefix="/api/repository-requests", tags=["repository-requests"])
GLOBAL_FIELD_PROMPTS = {
    "full legal name",
    "preferred name (optional)",
    "northeastern email",
    "expected graduation date",
    "current year / grade level",
    "co-op number (1st, 2nd, 3rd, etc.)",
    "major(s) - selected from a maintained dropdown list",
    "minor(s) - selected from a maintained dropdown list (optional)",
    "concentration - selected from a maintained dropdown list (optional)",
    "college / school within northeastern",
    "gpa (optional)",
    "github url (optional)",
    "linkedin url (optional)",
    "clubs and extracurricular activities (list)",
    "count of paid work experiences since high school graduation",
    "count of unpaid/volunteer experiences since high school graduation",
    "resume upload (pdf or docx, max 10mb)",
}


@router.get("", response_model=list[ApplicationSubmissionRead])
def list_repository_requests(db: Session = Depends(get_db)) -> list[ApplicationSubmission]:
    return db.query(ApplicationSubmission).order_by(ApplicationSubmission.created_at.desc()).all()


@router.get("/me", response_model=list[ApplicationSubmissionRead])
def list_my_repository_requests(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[ApplicationSubmission]:
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    return (
        db.query(ApplicationSubmission)
        .filter(ApplicationSubmission.applicant_email == user.email)
        .order_by(ApplicationSubmission.created_at.desc())
        .all()
    )


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    token = require_bearer_token(authorization)
    _ = get_or_create_user_from_access_token(db, token)

    filename = (file.filename or "").lower()
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume must be a PDF file.")
    content = await file.read()
    size_bytes = len(content)
    if size_bytes > 1 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume exceeds 1MB size limit.")
    file.file.seek(0)
    key = await storage_service.save(file, settings.s3_bucket_resumes, "candidate-resumes")
    view_url = storage_service.get_view_url(settings.s3_bucket_resumes, key)
    return {"resume_s3_key": key, "resume_view_url": view_url}


@router.post("", response_model=ApplicationSubmissionRead, status_code=status.HTTP_201_CREATED)
def create_repository_request(
    payload: ApplicationSubmissionCreate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ApplicationSubmission:
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    resolved_job_listing_id = payload.job_listing_id
    if resolved_job_listing_id is None and payload.job_listing_slug:
        by_slug = db.query(JobListing).filter(JobListing.listing_slug == payload.job_listing_slug.strip().lower()).first()
        if by_slug is not None:
            resolved_job_listing_id = by_slug.listing_id

    if resolved_job_listing_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="job_listing_id or job_listing_slug is required")

    job_listing = db.query(JobListing).filter(JobListing.id == resolved_job_listing_id).first()
    if job_listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")

    payload_data = payload.model_dump()
    payload_data["job_listing_id"] = resolved_job_listing_id
    payload_data.pop("job_listing_slug", None)
    if not payload_data.get("status"):
        payload_data["status"] = "applied"
    payload_data["applicant_email"] = user.email
    payload_data["applicant_name"] = payload_data.get("applicant_name") or f"{user.first_name} {user.last_name}".strip()

    answers: list[dict] = []
    try:
        parsed = json.loads(payload.responses_json)
        if isinstance(parsed, list):
            answers = [row for row in parsed if isinstance(row, dict)]
    except Exception:
        answers = []
    global_updates: dict[str, str] = {}
    for row in answers:
        prompt = str(row.get("question", "")).strip()
        answer = str(row.get("answer", "")).strip()
        is_global = bool(row.get("is_global")) or prompt.lower() in GLOBAL_FIELD_PROMPTS
        if not prompt or not is_global:
            continue
        global_updates[prompt] = answer
    if global_updates:
        user.user_metadata = merge_metadata(user.user_metadata, {"global_profile": global_updates})
        db.add(user)

    snapshot = merge_metadata(
        {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "user_metadata": user.user_metadata,
        },
        payload.profile_snapshot_json or {},
    )

    payload_data["profile_snapshot_json"] = snapshot
    submission = ApplicationSubmission(
        **payload_data,
        application_submission_created_at=datetime.utcnow(),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.patch("/{submission_id}/status", response_model=ApplicationSubmissionRead)
def update_repository_request_status(
    submission_id: int,
    payload: ApplicationSubmissionStatusUpdate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ApplicationSubmission:
    token = require_bearer_token(authorization)
    ensure_admin_user(db, token)
    submission = db.query(ApplicationSubmission).filter(ApplicationSubmission.id == submission_id).first()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    submission.status = payload.status
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/{submission_id}/resume-view-url")
def get_resume_view_url(
    submission_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    submission = db.query(ApplicationSubmission).filter(ApplicationSubmission.id == submission_id).first()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if not user.is_admin and submission.applicant_email != user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if not submission.resume_s3_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resume uploaded for this submission")
    return {"resume_view_url": storage_service.get_view_url(settings.s3_bucket_resumes, submission.resume_s3_key)}

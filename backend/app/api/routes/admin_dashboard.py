from collections import defaultdict
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import DemographicsSummary
from app.db import get_db
from app.models.models import ApplicationSubmission, JobListing

router = APIRouter(prefix="/api/admin", tags=["admin-dashboard"])


@router.get("/open-applications", response_model=list[dict[str, str | int]])
def get_open_applications(db: Session = Depends(get_db)) -> list[dict[str, str | int]]:
    submissions = (
        db.query(ApplicationSubmission)
        .filter(ApplicationSubmission.status.in_(["submitted", "in_review"]))
        .order_by(ApplicationSubmission.application_submission_created_at.desc())
        .all()
    )

    grouped: dict[int, dict[str, str | int]] = defaultdict(
        lambda: {"job": "", "status": "submitted", "date_opened": "", "total_submissions": 0}
    )
    for submission in submissions:
        job_listing = db.query(JobListing).filter(JobListing.listing_id == submission.job_listing_id).first()
        row = grouped[submission.job_listing_id]
        row["job"] = job_listing.job if job_listing else f"Listing {submission.job_listing_id}"
        row["status"] = submission.status
        row["date_opened"] = (
            job_listing.listing_date_created.date().isoformat()
            if job_listing
            else submission.application_submission_created_at.date().isoformat()
        )
        row["total_submissions"] = int(row["total_submissions"]) + 1
    return [dict(v) for v in grouped.values()]


@router.get("/past-applications", response_model=list[dict[str, str]])
def get_past_applications(db: Session = Depends(get_db)) -> list[dict[str, str]]:
    submissions = (
        db.query(ApplicationSubmission)
        .filter(ApplicationSubmission.status.in_(["closed", "rejected", "accepted"]))
        .order_by(ApplicationSubmission.application_submission_created_at.desc())
        .all()
    )

    results: list[dict[str, str]] = []
    for submission in submissions:
        job_listing = db.query(JobListing).filter(JobListing.listing_id == submission.job_listing_id).first()
        results.append(
            {
                "job": job_listing.job if job_listing else f"Listing {submission.job_listing_id}",
                "status": submission.status,
                "date_closed": submission.application_submission_created_at.date().isoformat(),
            }
        )
    return results


@router.get("/demographics-summary", response_model=DemographicsSummary)
def get_demographics_summary(db: Session = Depends(get_db)) -> DemographicsSummary:
    submissions = db.query(ApplicationSubmission).all()
    edu_count = 0
    other_count = 0
    for submission in submissions:
        try:
            payload = json.loads(submission.responses_json)
            email = payload.get("demographics", {}).get("email", submission.applicant_email)
        except Exception:
            email = submission.applicant_email
        if isinstance(email, str) and email.endswith(".edu"):
            edu_count += 1
        else:
            other_count += 1
    return DemographicsSummary(
        total_submissions=len(submissions),
        applicants_with_edu_email=edu_count,
        applicants_with_other_email=other_count,
    )

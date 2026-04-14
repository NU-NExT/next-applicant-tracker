import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import DemographicsSummary
from app.db import get_db
from app.models.models import ApplicationSubmission, JobListing

router = APIRouter(prefix="/api/admin", tags=["admin-dashboard"])


@router.get("/open-applications", response_model=list[dict[str, str | int]])
def get_open_applications(db: Session = Depends(get_db)) -> list[dict[str, str | int]]:
    now = datetime.now(timezone.utc)
    listings = (
        db.query(JobListing)
        .filter(
            JobListing.is_active == True,  # noqa: E712
            JobListing.listing_date_posted.isnot(None),
            ((JobListing.listing_date_end.is_(None)) | (JobListing.listing_date_end >= now)),
        )
        .order_by(JobListing.listing_date_end.asc(), JobListing.listing_date_created.desc())
        .all()
    )

    results: list[dict[str, str | int]] = []
    for listing in listings:
        total_submissions = (
            db.query(ApplicationSubmission)
            .filter(ApplicationSubmission.job_listing_id == listing.listing_id)
            .count()
        )
        results.append(
            {
                "job": listing.job,
                "date_posted": listing.listing_date_posted.date().isoformat(),
                "date_end": listing.listing_date_end.date().isoformat() if listing.listing_date_end else "",
                "total_submissions": total_submissions,
            }
        )
    return results


@router.get("/past-applications", response_model=list[dict[str, str]])
def get_past_applications(db: Session = Depends(get_db)) -> list[dict[str, str]]:
    now = datetime.now(timezone.utc)
    listings = (
        db.query(JobListing)
        .filter(
            JobListing.is_active == True,  # noqa: E712
            JobListing.listing_date_posted.isnot(None),
            JobListing.listing_date_end.isnot(None),
            JobListing.listing_date_end < now,
        )
        .order_by(JobListing.listing_date_end.desc(), JobListing.listing_date_created.desc())
        .all()
    )

    results: list[dict[str, str]] = []
    for listing in listings:
        results.append(
            {
                "job": listing.job,
                "date_posted": listing.listing_date_posted.date().isoformat(),
                "date_end": listing.listing_date_end.date().isoformat() if listing.listing_date_end else "",
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

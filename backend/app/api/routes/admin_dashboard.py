import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import DemographicsSummary
from app.db import get_db
from app.models.models import ApplicationCycle, ApplicationSubmission, JobListing

router = APIRouter(prefix="/api/admin", tags=["admin-dashboard"])
_SLUG_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")


def _slugify(value: str) -> str:
    return _SLUG_NON_ALNUM_RE.sub("-", value.strip().lower()).strip("-")


@router.get("/open-applications", response_model=list[dict[str, str | int | None]])
def get_open_applications(db: Session = Depends(get_db)) -> list[dict[str, str | int | None]]:
    now = datetime.now(timezone.utc)
    cycle_slug_map = {
        row.application_cycle_id: row.slug
        for row in db.query(ApplicationCycle.application_cycle_id, ApplicationCycle.slug).all()
    }
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

    results: list[dict[str, str | int | None]] = []
    for listing in listings:
        total_submissions = (
            db.query(ApplicationSubmission)
            .filter(ApplicationSubmission.job_listing_id == listing.listing_id)
            .count()
        )
        results.append(
            {
                "job": listing.job,
                "listing_id": listing.listing_id,
                "cycle_slug": cycle_slug_map.get(listing.application_cycle_id) if listing.application_cycle_id is not None else "uncategorized",
                "position_slug": listing.listing_slug or _slugify(listing.position_title or listing.job),
                "date_posted": listing.listing_date_posted.date().isoformat(),
                "date_end": listing.listing_date_end.date().isoformat() if listing.listing_date_end else "",
                "total_submissions": total_submissions,
            }
        )
    return results


@router.get("/past-applications", response_model=list[dict[str, str | int | None]])
def get_past_applications(db: Session = Depends(get_db)) -> list[dict[str, str | int | None]]:
    now = datetime.now(timezone.utc)
    cycle_slug_map = {
        row.application_cycle_id: row.slug
        for row in db.query(ApplicationCycle.application_cycle_id, ApplicationCycle.slug).all()
    }
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

    results: list[dict[str, str | int | None]] = []
    for listing in listings:
        results.append(
            {
                "job": listing.job,
                "listing_id": listing.listing_id,
                "cycle_slug": cycle_slug_map.get(listing.application_cycle_id) if listing.application_cycle_id is not None else "uncategorized",
                "position_slug": listing.listing_slug or _slugify(listing.position_title or listing.job),
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

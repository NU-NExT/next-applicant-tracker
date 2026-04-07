from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.authn import get_or_create_user_from_access_token, require_bearer_token
from app.db import get_db
from app.models.models import ApplicationConsent, ConsentVersion

router = APIRouter(prefix="/api/consent", tags=["consent"])


class ConsentVersionRead(BaseModel):
    consent_version_id: int
    consent_text: str
    consent_version_created_at: datetime

    class Config:
        from_attributes = True


class ConsentVersionCreate(BaseModel):
    consent_text: str


class ApplicationConsentRead(BaseModel):
    application_consent_id: int
    user_id: int
    job_listing_id: int
    application_submission_id: int | None
    consented_at: datetime
    consent_text: str
    is_active: bool

    class Config:
        from_attributes = True


class ApplicationConsentCreate(BaseModel):
    job_listing_id: int
    consent_text: str
    application_submission_id: int | None = None


@router.get("/latest", response_model=ConsentVersionRead)
def get_latest_consent(db: Session = Depends(get_db)):
    record = (
        db.query(ConsentVersion)
        .order_by(ConsentVersion.consent_version_created_at.desc())
        .first()
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No consent text found.")
    return record


@router.post("/", response_model=ConsentVersionRead, status_code=status.HTTP_201_CREATED)
def create_consent_version(payload: ConsentVersionCreate, db: Session = Depends(get_db)):
    record = ConsentVersion(
        consent_text=payload.consent_text,
        consent_version_created_at=datetime.now(tz=timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/application-consent", response_model=ApplicationConsentRead, status_code=status.HTTP_201_CREATED)
def record_application_consent(
    payload: ApplicationConsentCreate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    record = ApplicationConsent(
        user_id=user.user_id,
        job_listing_id=payload.job_listing_id,
        application_submission_id=payload.application_submission_id,
        consented_at=datetime.now(tz=timezone.utc),
        consent_text=payload.consent_text,
        is_active=True,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/application-consent/{consent_id}/deactivate", response_model=ApplicationConsentRead)
def deactivate_application_consent(
    consent_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    record = db.query(ApplicationConsent).filter(
        ApplicationConsent.application_consent_id == consent_id
    ).first()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent record not found.")
    if record.user_id != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")
    record.is_active = False
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

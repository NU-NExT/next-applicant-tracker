from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.authn import get_or_create_user_from_access_token, merge_metadata, require_bearer_token
from app.api.schemas import ProfileFullRead, ProfileFullUpdate, UserProfileRead, UserProfileUpdate
from app.db import get_db
from app.models.models import Profile

router = APIRouter(prefix="/api/profile", tags=["profile"])

PROFILE_FIELDS = [
    "full_legal_name", "phone_number", "expected_graduation_date", "current_year",
    "coop_number", "major", "minor", "concentration", "college", "gpa",
    "github_url", "linkedin_url", "personal_website_url", "club",
    "past_experience_count", "unique_experience_count",
]


@router.get("/me", response_model=UserProfileRead)
def get_my_profile(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    return user


@router.patch("/me", response_model=UserProfileRead)
def update_my_profile(
    payload: UserProfileUpdate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    user.user_metadata = merge_metadata(user.user_metadata, payload.user_metadata or {})
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _get_or_create_profile(db: Session, user_id: int) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if profile is None:
        profile = Profile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/me/extended", response_model=ProfileFullRead)
def get_my_full_profile(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    profile = _get_or_create_profile(db, user.user_id)
    return ProfileFullRead(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
        consented_at=user.consented_at,
        user_metadata=user.user_metadata or {},
        **{f: getattr(profile, f) for f in PROFILE_FIELDS},
    )


@router.patch("/me/extended", response_model=ProfileFullRead)
def update_my_full_profile(
    payload: ProfileFullUpdate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    db.add(user)

    profile = _get_or_create_profile(db, user.user_id)
    for field in PROFILE_FIELDS:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(profile, field, value)
    profile.profile_edited_at = datetime.now(timezone.utc)
    db.add(profile)
    db.commit()
    db.refresh(user)
    db.refresh(profile)
    return ProfileFullRead(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
        consented_at=user.consented_at,
        user_metadata=user.user_metadata or {},
        **{f: getattr(profile, f) for f in PROFILE_FIELDS},
    )


@router.post("/consent", response_model=UserProfileRead)
def accept_data_consent(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = require_bearer_token(authorization)
    user = get_or_create_user_from_access_token(db, token)
    user.consented_at = datetime.now(timezone.utc)
    user.user_metadata = merge_metadata(
        user.user_metadata,
        {"consent": {"accepted": True, "timestamp": user.consented_at.isoformat()}},
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

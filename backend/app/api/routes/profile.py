from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.authn import get_or_create_user_from_access_token, merge_metadata, require_bearer_token
from app.api.schemas import UserProfileRead, UserProfileUpdate
from app.db import get_db

router = APIRouter(prefix="/api/profile", tags=["profile"])


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

from typing import Any

import boto3
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import User


def require_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header.")
    return token


def cognito_client():
    return boto3.client(
        "cognito-idp",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def get_identity_from_token(access_token: str) -> dict[str, str]:
    client = cognito_client()
    try:
        response = client.get_user(AccessToken=access_token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.") from exc
    username = response.get("Username")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.")
    return {
        "username": username,
        "email": f"{username}@northeastern.edu",
    }


def get_or_create_user_from_access_token(db: Session, access_token: str, *, default_admin: bool = False) -> User:
    identity = get_identity_from_token(access_token)
    email = identity["email"]
    user = db.query(User).filter(User.email == email).first()
    if user is not None:
        return user
    username = identity["username"]
    user = User(
        email=email,
        password="<cognito-managed>",
        first_name=username,
        last_name="Applicant",
        is_admin=default_admin,
        user_metadata={"auth_provider": "cognito", "username": username},
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_admin_user(db: Session, access_token: str) -> User:
    user = get_or_create_user_from_access_token(db, access_token, default_admin=False)
    if not user.is_active or not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ADMIN privileges required.")
    return user


def merge_metadata(existing: dict[str, Any] | None, patch: dict[str, Any]) -> dict[str, Any]:
    merged = dict(existing or {})
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            nested = dict(merged[key])
            nested.update(value)
            merged[key] = nested
        else:
            merged[key] = value
    return merged

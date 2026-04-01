from typing import Any

import boto3
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import User
from app.security.passwords import hash_password


def require_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header.")
    return token


def cognito_client():
    cognito_region = (settings.cognito_aws_region or settings.aws_region).strip()
    cognito_access_key_id = (settings.cognito_aws_access_key_id or settings.aws_access_key_id).strip()
    cognito_secret_access_key = (settings.cognito_aws_secret_access_key or settings.aws_secret_access_key).strip()
    cognito_session_token = (settings.cognito_aws_session_token or settings.aws_session_token or "").strip()
    client_kwargs: dict[str, str] = {
        "region_name": cognito_region,
        "aws_access_key_id": cognito_access_key_id,
        "aws_secret_access_key": cognito_secret_access_key,
    }
    if cognito_session_token:
        client_kwargs["aws_session_token"] = cognito_session_token
    return boto3.client(
        "cognito-idp",
        **client_kwargs,
    )


def _attributes_map(attributes: list[dict[str, str]] | None) -> dict[str, str]:
    mapped: dict[str, str] = {}
    for row in attributes or []:
        key = row.get("Name")
        value = row.get("Value")
        if key and value is not None:
            mapped[key] = value
    return mapped


def get_identity_from_token(access_token: str) -> dict[str, str]:
    client = cognito_client()
    try:
        response = client.get_user(AccessToken=access_token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.") from exc
    username = response.get("Username")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.")
    attrs = _attributes_map(response.get("UserAttributes"))
    fallback_email = username if "@" in username else f"{username}@northeastern.edu"
    email = attrs.get("email", fallback_email).strip().lower()
    given_name = attrs.get("given_name") or username
    family_name = attrs.get("family_name") or "Applicant"
    return {
        "username": username,
        "email": email,
        "first_name": given_name,
        "last_name": family_name,
    }


def get_or_create_user_from_access_token(db: Session, access_token: str, *, default_admin: bool = False) -> User:
    identity = get_identity_from_token(access_token)
    email = identity["email"]
    user = db.query(User).filter(User.email == email).first()
    if user is not None:
        return user
    username = identity["username"]
    first_name = identity["first_name"]
    last_name = identity["last_name"]
    user = User(
        email=email,
        password=hash_password(f"cognito-managed::{username}"),
        first_name=first_name,
        last_name=last_name,
        is_admin=default_admin,
        user_metadata={"auth_provider": "cognito", "username": username},
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_admin_user(db: Session, access_token: str) -> User:
    user = get_or_create_user_from_access_token(db, access_token, default_admin=False)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ADMIN privileges required.")
    if user.is_admin:
        return user

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ADMIN privileges required.")


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

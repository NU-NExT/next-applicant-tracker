from typing import Any

import boto3
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import User


def is_cognito_enabled() -> bool:
    return bool(settings.cognito_user_pool_id and settings.cognito_app_client_id)


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
    if not is_cognito_enabled():
        if not access_token.startswith("local:"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid local access token.")
        email = access_token.removeprefix("local:").strip().lower()
        if not email.endswith("@northeastern.edu"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid local access token.")
        username = email.split("@", 1)[0]
        return {
            "username": username,
            "email": email,
        }

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
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ADMIN privileges required.")
    if user.is_admin:
        return user

    if not is_cognito_enabled():
        active_admin = db.query(User).filter(User.is_admin.is_(True), User.is_active.is_(True)).first()
        if active_admin is None:
            user.is_admin = True
            merged = dict(user.user_metadata or {})
            merged.update({"role": "ADMIN", "auth_provider": "local-fallback"})
            user.user_metadata = merged
            db.add(user)
            db.commit()
            db.refresh(user)
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

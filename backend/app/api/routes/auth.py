import base64
import hashlib
import hmac
import re
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.authn import ensure_admin_user, require_bearer_token
from app.config import settings
from app.db import get_db
from app.models.models import User
from app.security.passwords import hash_password
from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthLoginRequest(BaseModel):
    email: str
    password: str


class AuthRegisterApplicantRequest(BaseModel):
    email: str
    password: str
    return_to: str | None = None

    @field_validator("email")
    @classmethod
    def validate_northeastern_email(cls, value: str) -> str:
        email, _ = _northeastern_username_from_email(value)
        return email


class AuthForgotPasswordRequest(BaseModel):
    email: str


class AuthConfirmForgotPasswordRequest(BaseModel):
    email: str
    confirmation_code: str
    new_password: str


class AuthCreateAdminRequest(BaseModel):
    email: str
    name: str


class AuthDeactivateAdminRequest(BaseModel):
    email: str


class DevLoginRequest(BaseModel):
    email: str


@router.post("/dev-login")
def dev_login(payload: DevLoginRequest, db: Session = Depends(get_db)):
    """Dev-only: returns a mock token for a seeded user. Disabled in production."""
    if settings.environment != "development":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No user with email {email}")
    token = f"dev-token::{email}"
    return {
        "access_token": token,
        "id_token": token,
        "refresh_token": token,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_admin": user.is_admin,
    }


def _get_cognito_client():
    if not settings.cognito_user_pool_id or not settings.cognito_app_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cognito is not configured on the server.",
        )
    client_kwargs: dict[str, str] = {
        "region_name": settings.aws_region,
        "aws_access_key_id": settings.aws_access_key_id,
        "aws_secret_access_key": settings.aws_secret_access_key,
    }
    if settings.aws_session_token:
        client_kwargs["aws_session_token"] = settings.aws_session_token
    return boto3.client(
        "cognito-idp",
        **client_kwargs,
    )


def _northeastern_username_from_email(raw_email: str) -> tuple[str, str]:
    email = raw_email.strip().lower()
    if not email.endswith("@northeastern.edu"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only @northeastern.edu email accounts are allowed.",
        )
    username = email.split("@", 1)[0].strip()
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Northeastern email.")
    return email, username


def _cognito_username(email: str, username: str) -> str:
    # This user pool requires email-style usernames.
    # Keep local `username` for internal metadata, but use email in Cognito auth APIs.
    _ = username  # retained for signature compatibility with existing callers
    return email


_RETURN_TO_JOB_LOGIN_RE = re.compile(r"^/jobs/[^/?#]+/login$")


def _normalize_return_to(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip()
    if not value:
        return None
    if value == "/login" or _RETURN_TO_JOB_LOGIN_RE.match(value):
        return value
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid return path for signup verification.",
    )


def _secret_hash(username: str) -> str | None:
    secret = settings.cognito_app_client_secret.strip()
    if not secret:
        return None
    digest = hmac.new(
        secret.encode("utf-8"),
        msg=f"{username}{settings.cognito_app_client_id}".encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode("utf-8")


def _is_in_admin_group(cognito: Any, cognito_username: str) -> bool:
    if not settings.cognito_user_pool_id:
        return False
    try:
        response = cognito.admin_list_groups_for_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=cognito_username,
        )
        groups = response.get("Groups", [])
        return any(group.get("GroupName") == settings.cognito_admin_group_name for group in groups)
    except ClientError:
        return False


def _ensure_admin_group_membership(cognito: Any, cognito_username: str) -> None:
    if not settings.cognito_user_pool_id:
        return
    try:
        cognito.admin_add_user_to_group(
            UserPoolId=settings.cognito_user_pool_id,
            Username=cognito_username,
            GroupName=settings.cognito_admin_group_name,
        )
    except ClientError:
        # Keep login non-blocking if group sync fails.
        return


def _attributes_map(attributes: list[dict[str, str]] | None) -> dict[str, str]:
    mapped: dict[str, str] = {}
    for row in attributes or []:
        key = row.get("Name")
        value = row.get("Value")
        if key and value is not None:
            mapped[key] = value
    return mapped


def _cognito_profile(cognito: Any, access_token: str) -> dict[str, str]:
    response = cognito.get_user(AccessToken=access_token)
    username = response.get("Username", "").strip()
    attrs = _attributes_map(response.get("UserAttributes"))
    email = attrs.get("email", f"{username}@northeastern.edu").strip().lower()
    first_name = (attrs.get("given_name") or username or email.split("@", 1)[0]).strip()
    last_name = (attrs.get("family_name") or "Applicant").strip()
    return {
        "username": username or email.split("@", 1)[0],
        "email": email,
        "first_name": first_name or "Applicant",
        "last_name": last_name or "Applicant",
    }


def _upsert_cognito_user(
    db: Session,
    *,
    email: str,
    username: str,
    raw_password: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            email=email,
            password=hash_password(raw_password or f"cognito-managed::{username}"),
            first_name=first_name or username,
            last_name=last_name or "Applicant",
            is_admin=False,
            is_active=True,
            user_metadata={"auth_provider": "cognito", "username": username},
        )
    else:
        if raw_password:
            user.password = hash_password(raw_password)
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        merged = dict(user.user_metadata or {})
        merged.update({"auth_provider": "cognito", "username": username})
        user.user_metadata = merged
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register-applicant")
def register_applicant(payload: AuthRegisterApplicantRequest, db: Session = Depends(get_db)):
    email, username = _northeastern_username_from_email(payload.email)
    cognito_username = _cognito_username(email, username)
    cognito = _get_cognito_client()
    hash_value = _secret_hash(cognito_username)
    return_to = _normalize_return_to(payload.return_to)

    try:
        sign_up_payload: dict[str, Any] = {
            "ClientId": settings.cognito_app_client_id,
            "Username": cognito_username,
            "Password": payload.password,
            "UserAttributes": [
                {"Name": "email", "Value": email},
            ],
        }
        if hash_value:
            sign_up_payload["SecretHash"] = hash_value
        if return_to:
            sign_up_payload["ClientMetadata"] = {"return_to": return_to}

        cognito.sign_up(
            **sign_up_payload
        )
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.response.get("Error", {}).get("Message", "Failed to register applicant."),
        ) from exc
    except BotoCoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Cognito service. Verify AWS/Cognito configuration.",
        ) from exc

    _upsert_cognito_user(db, email=email, username=username, raw_password=payload.password)
    return {"message": "Applicant registration submitted.", "username": username}


@router.post("/login")
def login(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    email, username = _northeastern_username_from_email(payload.email)
    cognito_username = _cognito_username(email, username)
    cognito = _get_cognito_client()
    auth_parameters = {"USERNAME": cognito_username, "PASSWORD": payload.password}
    hash_value = _secret_hash(cognito_username)
    if hash_value:
        auth_parameters["SECRET_HASH"] = hash_value

    try:
        response = cognito.initiate_auth(
            ClientId=settings.cognito_app_client_id,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters=auth_parameters,
        )
        result = response.get("AuthenticationResult", {})
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.response.get("Error", {}).get("Message", "Invalid credentials."),
        ) from exc

    access_token = result.get("AccessToken")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token.")
    profile = _cognito_profile(cognito, access_token)
    active_user = _upsert_cognito_user(
        db,
        email=profile["email"],
        username=profile["username"],
        raw_password=payload.password,
    )
    group_is_admin = _is_in_admin_group(cognito, cognito_username)
    db_is_admin = bool(active_user.is_admin)
    resolved_is_admin = db_is_admin or group_is_admin
    if resolved_is_admin and not group_is_admin:
        _ensure_admin_group_membership(cognito, cognito_username)
    if active_user.is_admin != resolved_is_admin:
        active_user.is_admin = resolved_is_admin
        db.add(active_user)
        db.commit()
        db.refresh(active_user)

    if not active_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    return {
        "access_token": result.get("AccessToken"),
        "id_token": result.get("IdToken"),
        "refresh_token": result.get("RefreshToken"),
        "expires_in": result.get("ExpiresIn"),
        "token_type": result.get("TokenType", "Bearer"),
        "username": profile["username"],
        "email": active_user.email,
        "first_name": active_user.first_name,
        "last_name": active_user.last_name,
        "is_admin": active_user.is_admin,
    }


@router.post("/forgot-password")
def forgot_password(payload: AuthForgotPasswordRequest):
    email, username = _northeastern_username_from_email(payload.email)
    cognito_username = _cognito_username(email, username)
    cognito = _get_cognito_client()
    hash_value = _secret_hash(cognito_username)
    request_payload: dict[str, Any] = {
        "ClientId": settings.cognito_app_client_id,
        "Username": cognito_username,
    }
    if hash_value:
        request_payload["SecretHash"] = hash_value

    try:
        cognito.forgot_password(**request_payload)
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.response.get("Error", {}).get("Message", "Failed to start password reset."),
        ) from exc

    return {"message": "Password reset code sent via email."}


@router.post("/confirm-forgot-password")
def confirm_forgot_password(payload: AuthConfirmForgotPasswordRequest, db: Session = Depends(get_db)):
    email, username = _northeastern_username_from_email(payload.email)
    cognito_username = _cognito_username(email, username)
    cognito = _get_cognito_client()
    hash_value = _secret_hash(cognito_username)
    request_payload: dict[str, Any] = {
        "ClientId": settings.cognito_app_client_id,
        "Username": cognito_username,
        "ConfirmationCode": payload.confirmation_code,
        "Password": payload.new_password,
    }
    if hash_value:
        request_payload["SecretHash"] = hash_value

    try:
        cognito.confirm_forgot_password(**request_payload)
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.response.get("Error", {}).get("Message", "Failed to reset password."),
        ) from exc

    _upsert_cognito_user(db, email=email, username=username, raw_password=payload.new_password)
    return {"message": "Password has been reset successfully."}


@router.post("/admin/create-admin")
def create_admin(
    payload: AuthCreateAdminRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    email, username = _northeastern_username_from_email(payload.email)
    cognito_username = _cognito_username(email, username)
    access_token = require_bearer_token(authorization)
    ensure_admin_user(db, access_token)
    cognito = _get_cognito_client()

    try:
        name_parts = payload.name.strip().split(" ", 1)
        given_name = name_parts[0] if name_parts else username
        family_name = name_parts[1] if len(name_parts) > 1 else "Admin"
        cognito.admin_create_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=cognito_username,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "given_name", "Value": given_name},
                {"Name": "family_name", "Value": family_name},
            ],
            DesiredDeliveryMediums=["EMAIL"],
        )
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code != "UsernameExistsException":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=exc.response.get("Error", {}).get("Message", "Failed to create ADMIN account."),
            ) from exc

    try:
        cognito.admin_add_user_to_group(
            UserPoolId=settings.cognito_user_pool_id,
            Username=cognito_username,
            GroupName=settings.cognito_admin_group_name,
        )
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.response.get("Error", {}).get("Message", "Failed to assign ADMIN role."),
        ) from exc

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        name_parts = payload.name.strip().split(" ", 1)
        first_name = name_parts[0] if name_parts else username
        last_name = name_parts[1] if len(name_parts) > 1 else "Admin"
        user = User(
            email=email,
            password=hash_password(f"cognito-managed::{username}"),
            first_name=first_name,
            last_name=last_name,
            is_admin=True,
            user_metadata={"auth_provider": "cognito", "username": username, "role": "ADMIN"},
        )
    else:
        user.is_admin = True
        merged = dict(user.user_metadata or {})
        merged.update({"auth_provider": "cognito", "username": username, "role": "ADMIN"})
        user.user_metadata = merged
    db.add(user)
    db.commit()
    return {"message": "ADMIN account created successfully.", "username": username}


@router.post("/admin/deactivate")
def deactivate_admin(
    payload: AuthDeactivateAdminRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    email, username = _northeastern_username_from_email(payload.email)
    cognito_username = _cognito_username(email, username)
    access_token = require_bearer_token(authorization)
    ensure_admin_user(db, access_token)
    cognito = _get_cognito_client()

    try:
        cognito.admin_remove_user_from_group(
            UserPoolId=settings.cognito_user_pool_id,
            Username=cognito_username,
            GroupName=settings.cognito_admin_group_name,
        )
    except ClientError:
        pass

    try:
        cognito.admin_disable_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=cognito_username,
        )
    except ClientError:
        pass

    user = db.query(User).filter(User.email == email).first()
    if user:
        user.is_admin = False
        user.is_active = False
        db.add(user)
        db.commit()

    return {"message": "ADMIN account deactivated.", "username": username}

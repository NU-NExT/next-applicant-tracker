import base64
import hashlib
import hmac
from typing import Any

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.authn import ensure_admin_user, require_bearer_token
from app.config import settings
from app.db import get_db
from app.models.models import User
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthLoginRequest(BaseModel):
    email: str
    password: str
    admin_mode: bool = False


class AuthRegisterApplicantRequest(BaseModel):
    email: str
    password: str


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


def _get_cognito_client():
    if not settings.cognito_user_pool_id or not settings.cognito_app_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cognito is not configured on the server.",
        )
    return boto3.client(
        "cognito-idp",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
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


def _is_admin_user(cognito: Any, access_token: str, db: Session) -> tuple[bool, str | None]:
    try:
        user_resp = cognito.get_user(AccessToken=access_token)
        username = user_resp.get("Username")
        if not username:
            return False, None
        email = f"{username}@northeastern.edu"
        user = db.query(User).filter(User.email == email).first()
        return bool(user and user.is_admin), username
    except ClientError:
        return False, None


@router.post("/register-applicant")
def register_applicant(payload: AuthRegisterApplicantRequest, db: Session = Depends(get_db)):
    email, username = _northeastern_username_from_email(payload.email)
    cognito = _get_cognito_client()
    hash_value = _secret_hash(username)

    try:
        sign_up_payload: dict[str, Any] = {
            "ClientId": settings.cognito_app_client_id,
            "Username": username,
            "Password": payload.password,
            "UserAttributes": [
                {"Name": "email", "Value": email},
            ],
        }
        if hash_value:
            sign_up_payload["SecretHash"] = hash_value

        cognito.sign_up(
            **sign_up_payload
        )
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.response.get("Error", {}).get("Message", "Failed to register applicant."),
        ) from exc

    existing = db.query(User).filter(User.email == email).first()
    if existing is None:
        local = email.split("@", 1)[0]
        existing = User(
            email=email,
            password="<cognito-managed>",
            first_name=local,
            last_name="Applicant",
            is_admin=False,
            user_metadata={"auth_provider": "cognito", "username": username},
        )
        db.add(existing)
    else:
        merged = dict(existing.user_metadata or {})
        merged.update({"auth_provider": "cognito", "username": username})
        existing.user_metadata = merged
        db.add(existing)
    db.commit()
    return {"message": "Applicant registration submitted.", "username": username}


@router.post("/login")
def login(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    email, username = _northeastern_username_from_email(payload.email)
    cognito = _get_cognito_client()
    auth_parameters = {"USERNAME": username, "PASSWORD": payload.password}
    hash_value = _secret_hash(username)
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

    if payload.admin_mode:
        access_token = result.get("AccessToken")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token.")
        is_admin, _ = _is_admin_user(cognito, access_token, db)
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator access is restricted to ADMIN accounts.",
            )
    else:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                email=email,
                password="<cognito-managed>",
                first_name=username,
                last_name="Applicant",
                is_admin=False,
                user_metadata={"auth_provider": "cognito", "username": username},
            )
        else:
            merged = dict(user.user_metadata or {})
            merged.update({"auth_provider": "cognito", "username": username})
            user.user_metadata = merged
        db.add(user)
        db.commit()

    active_user = db.query(User).filter(User.email == email).first()
    if active_user is not None and not active_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    return {
        "access_token": result.get("AccessToken"),
        "id_token": result.get("IdToken"),
        "refresh_token": result.get("RefreshToken"),
        "expires_in": result.get("ExpiresIn"),
        "token_type": result.get("TokenType", "Bearer"),
        "username": username,
    }


@router.post("/forgot-password")
def forgot_password(payload: AuthForgotPasswordRequest):
    _, username = _northeastern_username_from_email(payload.email)
    cognito = _get_cognito_client()
    hash_value = _secret_hash(username)
    request_payload: dict[str, Any] = {
        "ClientId": settings.cognito_app_client_id,
        "Username": username,
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
def confirm_forgot_password(payload: AuthConfirmForgotPasswordRequest):
    _, username = _northeastern_username_from_email(payload.email)
    cognito = _get_cognito_client()
    hash_value = _secret_hash(username)
    request_payload: dict[str, Any] = {
        "ClientId": settings.cognito_app_client_id,
        "Username": username,
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

    return {"message": "Password has been reset successfully."}


@router.post("/admin/create-admin")
def create_admin(
    payload: AuthCreateAdminRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    email, username = _northeastern_username_from_email(payload.email)
    cognito = _get_cognito_client()
    access_token = require_bearer_token(authorization)
    ensure_admin_user(db, access_token)

    try:
        name_parts = payload.name.strip().split(" ", 1)
        given_name = name_parts[0] if name_parts else username
        family_name = name_parts[1] if len(name_parts) > 1 else "Admin"
        cognito.admin_create_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=username,
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
            Username=username,
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
            password="<cognito-managed>",
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
    cognito = _get_cognito_client()
    access_token = require_bearer_token(authorization)
    ensure_admin_user(db, access_token)

    try:
        cognito.admin_remove_user_from_group(
            UserPoolId=settings.cognito_user_pool_id,
            Username=username,
            GroupName=settings.cognito_admin_group_name,
        )
    except ClientError:
        pass

    try:
        cognito.admin_disable_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=username,
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

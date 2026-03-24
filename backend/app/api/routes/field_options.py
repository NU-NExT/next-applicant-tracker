from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.authn import ensure_admin_user, require_bearer_token
from app.api.schemas import FieldOptionCreate, FieldOptionRead, FieldOptionUpdate
from app.db import get_db
from app.models.models import FieldOption

router = APIRouter(prefix="/api/admin/field-options", tags=["field-options"])


def _assert_admin_from_db(authorization: str | None, db: Session) -> None:
    token = require_bearer_token(authorization)
    ensure_admin_user(db, token)


@router.get("", response_model=list[FieldOptionRead])
def list_field_options(
    category: str | None = None,
    db: Session = Depends(get_db),
) -> list[FieldOption]:
    query = db.query(FieldOption)
    if category:
        query = query.filter(FieldOption.category == category.strip().lower())
    return query.order_by(FieldOption.category.asc(), FieldOption.sort_order.asc(), FieldOption.id.asc()).all()


@router.post("", response_model=FieldOptionRead, status_code=status.HTTP_201_CREATED)
def create_field_option(
    payload: FieldOptionCreate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> FieldOption:
    _assert_admin_from_db(authorization, db)
    option = FieldOption(
        category=payload.category.strip().lower(),
        value=payload.value.strip(),
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


@router.patch("/{option_id}", response_model=FieldOptionRead)
def update_field_option(
    option_id: int,
    payload: FieldOptionUpdate,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> FieldOption:
    _assert_admin_from_db(authorization, db)
    option = db.query(FieldOption).filter(FieldOption.id == option_id).first()
    if option is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field option not found")
    updates: dict[str, Any] = payload.model_dump(exclude_unset=True)
    if "value" in updates and updates["value"] is not None:
        updates["value"] = str(updates["value"]).strip()
    for key, value in updates.items():
        setattr(option, key, value)
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


@router.delete("/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_field_option(
    option_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> None:
    _assert_admin_from_db(authorization, db)
    option = db.query(FieldOption).filter(FieldOption.id == option_id).first()
    if option is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field option not found")
    db.delete(option)
    db.commit()

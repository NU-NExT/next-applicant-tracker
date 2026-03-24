"""0012_hash_seed_user_passwords

Revision ID: 0012_hash_seed_pwds
Revises: 0011_std_col_names
Create Date: 2026-03-20 00:00:00
"""

from __future__ import annotations

import base64
import hashlib
import os

from alembic import op
import sqlalchemy as sa


revision = "0012_hash_seed_pwds"
down_revision = "0011_std_col_names"
branch_labels = None
depends_on = None

PBKDF2_ROUNDS = 260000
PBKDF2_PREFIX = "pbkdf2_sha256$"


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ROUNDS)
    salt_b64 = base64.urlsafe_b64encode(salt).decode("utf-8").rstrip("=")
    digest_b64 = base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${salt_b64}${digest_b64}"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "users" not in inspector.get_table_names():
        return

    user_cols = {column["name"] for column in inspector.get_columns("users")}
    pk_col = "user_id" if "user_id" in user_cols else "id"
    metadata_col = "user_metadata" if "user_metadata" in user_cols else None

    rows = bind.execute(sa.text(f"SELECT {pk_col} AS pk, password FROM users")).mappings().all()
    for row in rows:
        raw_password = row.get("password")
        if not isinstance(raw_password, str) or raw_password.startswith(PBKDF2_PREFIX):
            continue
        bind.execute(
            sa.text(f"UPDATE users SET password = :password WHERE {pk_col} = :pk"),
            {"password": _hash_password(raw_password), "pk": row["pk"]},
        )

    # Normalize seeded/local-fallback metadata to Cognito provider semantics.
    if metadata_col:
        bind.execute(
            sa.text(
                f"""
                UPDATE users
                SET {metadata_col} = jsonb_set(
                    COALESCE({metadata_col}::jsonb, '{{}}'::jsonb),
                    '{{auth_provider}}',
                    '"cognito"'::jsonb,
                    true
                )
                WHERE COALESCE({metadata_col}::jsonb ->> 'auth_provider', '') IN ('seed', 'local-fallback')
                """
            )
        )


def downgrade() -> None:
    # Irreversible: plaintext recovery is intentionally unsupported.
    pass

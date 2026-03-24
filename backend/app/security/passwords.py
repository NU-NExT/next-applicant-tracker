import base64
import hashlib
import hmac
import os


PBKDF2_ROUNDS = 260000
PBKDF2_PREFIX = "pbkdf2_sha256"


def is_password_hash(value: str | None) -> bool:
    return bool(value and value.startswith(f"{PBKDF2_PREFIX}$"))


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ROUNDS)
    salt_b64 = base64.urlsafe_b64encode(salt).decode("utf-8").rstrip("=")
    digest_b64 = base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")
    return f"{PBKDF2_PREFIX}${PBKDF2_ROUNDS}${salt_b64}${digest_b64}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        prefix, rounds_raw, salt_b64, digest_b64 = encoded.split("$", 3)
        if prefix != PBKDF2_PREFIX:
            return False
        rounds = int(rounds_raw)
        salt = base64.urlsafe_b64decode(salt_b64 + "=" * (-len(salt_b64) % 4))
        expected = base64.urlsafe_b64decode(digest_b64 + "=" * (-len(digest_b64) % 4))
    except (ValueError, TypeError):
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
    return hmac.compare_digest(actual, expected)

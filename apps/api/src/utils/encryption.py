"""Simple encryption for sensitive data at rest (IRIS credentials, etc.)

Uses Fernet symmetric encryption derived from the app's SECRET_KEY.
For production, prefer AWS Secrets Manager instead.
"""

import base64
import hashlib

from cryptography.fernet import Fernet


def _get_fernet(secret_key: str) -> Fernet:
    """Derive a Fernet key from the app's secret key."""
    key = base64.urlsafe_b64encode(hashlib.sha256(secret_key.encode()).digest())
    return Fernet(key)


def encrypt_value(value: str, secret_key: str) -> str:
    """Encrypt a string value. Returns base64 encoded ciphertext."""
    f = _get_fernet(secret_key)
    return f.encrypt(value.encode()).decode()


def decrypt_value(encrypted: str, secret_key: str) -> str:
    """Decrypt an encrypted value. Returns plaintext string."""
    f = _get_fernet(secret_key)
    return f.decrypt(encrypted.encode()).decode()

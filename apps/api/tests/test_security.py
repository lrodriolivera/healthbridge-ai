"""Tests for security utilities (password hashing, JWT)"""

import pytest
from src.utils.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        password = "my-secure-password"
        hashed = get_password_hash(password)
        assert hashed != password
        assert verify_password(password, hashed)

    def test_wrong_password_fails(self):
        hashed = get_password_hash("correct-password")
        assert not verify_password("wrong-password", hashed)

    def test_different_hashes_for_same_password(self):
        h1 = get_password_hash("password")
        h2 = get_password_hash("password")
        assert h1 != h2  # bcrypt uses random salt


class TestJWT:
    def test_create_and_decode(self):
        data = {"sub": "user-123", "tenant_id": "tenant-456", "role": "admin"}
        token = create_access_token(data)
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["tenant_id"] == "tenant-456"
        assert payload["role"] == "admin"
        assert "exp" in payload

    def test_invalid_token_returns_none(self):
        assert decode_access_token("invalid.token.here") is None
        assert decode_access_token("") is None

    def test_tampered_token_returns_none(self):
        token = create_access_token({"sub": "user-123"})
        tampered = token[:-5] + "XXXXX"
        assert decode_access_token(tampered) is None

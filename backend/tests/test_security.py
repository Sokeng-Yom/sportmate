from jose import jwt
from datetime import datetime, timedelta
from base64 import urlsafe_b64encode

import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from app.core import security as security_module
from app.core.config import settings
from app.core.security import get_current_user


def make_token(sub="user-123", exp_delta=timedelta(hours=1), include_sub=True, secret=None):
    payload = {
        "aud": "authenticated",
        "exp": datetime.utcnow() + exp_delta,
    }

    if include_sub:
        payload["sub"] = sub

    return jwt.encode(
        payload,
        secret if secret is not None else settings.supabase_jwt_secret,
        algorithm="HS256",
    )


def _es256_jwk_from_private_key(private_key):
    """Builds a JWK dict (matching Supabase's jwks.json EC/ES256 entry) from a public key."""
    numbers = private_key.public_key().public_numbers()
    size = (private_key.curve.key_size + 7) // 8
    return {
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "use": "sig",
        "x": urlsafe_b64encode(numbers.x.to_bytes(size, "big")).rstrip(b"=").decode("ascii"),
        "y": urlsafe_b64encode(numbers.y.to_bytes(size, "big")).rstrip(b"=").decode("ascii"),
    }


def _es256_token(claims, private_key):
    payload = {"aud": "authenticated", "exp": datetime.utcnow() + timedelta(hours=1), **claims}
    return jwt.encode(payload, private_key, algorithm="ES256")


def test_missing_header_returns_401(client):
    response = client.get("/api/v1/profiles/me")

    assert response.status_code == 401
    assert "Missing" in response.json()["detail"]


def test_malformed_header_returns_401(client):
    response = client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": "NotBearer abc"},
    )

    assert response.status_code == 401


def test_expired_token_returns_401(client, monkeypatch):
    monkeypatch.setattr(security_module, "_get_public_keys", lambda: [])
    token = make_token(exp_delta=timedelta(seconds=-10))

    response = client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_token_missing_sub_returns_401(client):
    token = make_token(include_sub=False)

    response = client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_garbage_token_returns_401(client, monkeypatch):
    monkeypatch.setattr(security_module, "_get_public_keys", lambda: [])
    response = client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": "Bearer not.a.real.jwt"},
    )

    assert response.status_code == 401


def test_token_signed_with_alternate_jwt_secret_is_accepted():
    """A token signed with the other configured signing key (legacy vs new Supabase keys)
    must still authenticate — one of them is the key the project currently signs with."""
    if not settings.jwt_secret or settings.jwt_secret == settings.supabase_jwt_secret:
        pytest.skip("No distinct alternate JWT secret configured in .env")

    token = make_token(secret=settings.jwt_secret)
    user = get_current_user(authorization=f"Bearer {token}")

    assert user["sub"] == "user-123"


def test_token_signed_with_unknown_secret_is_rejected(monkeypatch):
    """A signature that matches none of the configured project keys stays a 401."""
    monkeypatch.setattr(security_module, "_get_public_keys", lambda: [])
    token = make_token(secret="totally-unknown-key-value-1234567890abcdef")

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(authorization=f"Bearer {token}")

    assert exc_info.value.status_code == 401


def test_es256_token_verified_with_jwks_public_key(monkeypatch):
    """Current Supabase projects sign access tokens with ES256 — the public
    signing key comes from the project's JWKS endpoint."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    token = _es256_token({"sub": "user-123"}, private_key)
    monkeypatch.setattr(
        security_module,
        "_get_public_keys",
        lambda: [_es256_jwk_from_private_key(private_key)],
    )

    user = get_current_user(authorization=f"Bearer {token}")

    assert user["sub"] == "user-123"


def test_es256_token_signed_by_another_key_is_rejected(monkeypatch):
    """An ES256 token signed by a different key must still be a 401."""
    signer = ec.generate_private_key(ec.SECP256R1())
    verifier = ec.generate_private_key(ec.SECP256R1())
    token = _es256_token({"sub": "user-123"}, signer)
    monkeypatch.setattr(
        security_module,
        "_get_public_keys",
        lambda: [_es256_jwk_from_private_key(verifier)],
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(authorization=f"Bearer {token}")

    assert exc_info.value.status_code == 401


def test_expired_es256_token_is_rejected(monkeypatch):
    """Expiry is enforced for the asymmetric path too."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    payload = {"aud": "authenticated", "sub": "user-123", "exp": datetime.utcnow() - timedelta(seconds=10)}
    token = jwt.encode(payload, private_key, algorithm="ES256")
    monkeypatch.setattr(
        security_module,
        "_get_public_keys",
        lambda: [_es256_jwk_from_private_key(private_key)],
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(authorization=f"Bearer {token}")

    assert exc_info.value.status_code == 401
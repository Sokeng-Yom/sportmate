from jose import jwt
from datetime import datetime, timedelta

from app.core.config import settings


def make_token(sub="user-123", exp_delta=timedelta(hours=1), include_sub=True):
    payload = {
        "aud": "authenticated",
        "exp": datetime.utcnow() + exp_delta,
    }

    if include_sub:
        payload["sub"] = sub

    return jwt.encode(
        payload,
        settings.supabase_jwt_secret,
        algorithm="HS256",
    )


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


def test_expired_token_returns_401(client):
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


def test_garbage_token_returns_401(client):
    response = client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": "Bearer not.a.real.jwt"},
    )

    assert response.status_code == 401
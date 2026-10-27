import base64
import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.core.config import settings
from tests.conftest import make_token

URL = "/api/v1/profiles/me"


def _bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _b64(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()


def _claims(**overrides) -> dict:
    claims = {
        "aud": "authenticated",
        "sub": str(uuid.uuid4()),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
    }
    claims.update(overrides)
    return claims


def test_token_signed_with_the_wrong_secret_is_rejected(client):
    token = jwt.encode(_claims(), "not-the-real-secret", algorithm="HS256")
    response = client.get(URL, headers=_bearer(token))
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid token"}


def test_unsigned_alg_none_token_is_rejected(client):
    token = f"{_b64({'alg': 'none', 'typ': 'JWT'})}.{_b64(_claims())}."
    assert client.get(URL, headers=_bearer(token)).status_code == 401


def test_token_for_a_different_audience_is_rejected(client):
    token = jwt.encode(_claims(aud="somebody-else"), settings.supabase_jwt_secret, algorithm="HS256")
    assert client.get(URL, headers=_bearer(token)).status_code == 401


@pytest.mark.parametrize("key_name", ["supabase_anon_key", "supabase_service_role_key"])
def test_supabase_api_keys_are_not_user_tokens(client, key_name):
    """The public anon key and the secret service key must never authenticate as a user."""
    assert client.get(URL, headers=_bearer(getattr(settings, key_name))).status_code == 401


def test_token_with_a_non_uuid_subject_is_a_clean_401(client):
    assert client.get(URL, headers=_bearer(make_token("not-a-uuid"))).status_code == 401


@pytest.mark.parametrize("url", [URL, "/api/v1/admin/ping", "/api/v1/venues/ping"])
def test_valid_token_for_an_account_that_no_longer_exists_is_401(client, url):
    response = client.get(url, headers=_bearer(make_token(str(uuid.uuid4()))))
    assert response.status_code == 401
    assert response.json() == {"detail": "Account not found"}


@pytest.mark.parametrize("header", ["Bearer", "Bearer ", "bearer abc", "Basic abc", "Token abc", "Bearer a b c"])
def test_malformed_authorization_headers_are_401(client, header):
    assert client.get(URL, headers={"Authorization": header}).status_code == 401


def test_auth_errors_use_the_standard_shape_and_leak_nothing(client):
    expired = make_token(str(uuid.uuid4()), timedelta(seconds=-5))
    for headers in (None, _bearer("garbage"), _bearer(expired)):
        response = client.get(URL, headers=headers)
        assert response.status_code == 401
        body = response.json()
        assert set(body) == {"detail"} and isinstance(body["detail"], str)
        assert settings.supabase_jwt_secret not in response.text

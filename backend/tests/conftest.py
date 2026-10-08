import time
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings
from app.db.session import SessionLocal
from app.db.user_purge import purge_users
from app.main import app
from app.models.profile import Profile


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()


def make_token(sub: str, exp_delta=timedelta(hours=1)):
    payload = {
        "aud": "authenticated",
        "sub": sub,
        "exp": datetime.now(timezone.utc) + exp_delta,
    }
    return jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")


@pytest.fixture
def supabase_admin():
    """Client for Supabase's Auth Admin API (service role)."""
    key = settings.supabase_service_role_key
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    with httpx.Client(
        base_url=f"{settings.supabase_url}/auth/v1/admin", headers=headers, timeout=15
    ) as client:
        yield client


@pytest.fixture
def seeded_profile(supabase_admin, db_session):
    """
    Creates REAL Supabase auth users (the signup trigger creates their profiles)
    and removes them, plus everything that references them, after the test.
    """
    created_user_ids: list[str] = []

    def _make(role: str):
        email = f"test-{uuid.uuid4().hex[:10]}@example.com"
        response = supabase_admin.post(
            "/users",
            json={
                "email": email,
                "password": "TestPassword123!",
                "email_confirm": True,
                "user_metadata": {"name": f"Test {role}", "role": role},
            },
        )
        response.raise_for_status()
        user_id = response.json()["id"]
        created_user_ids.append(user_id)

        profile = None
        for _ in range(10):
            profile = db_session.query(Profile).filter(Profile.id == user_id).first()
            if profile:
                break
            time.sleep(0.2)
            db_session.expire_all()
        if not profile:
            raise RuntimeError(f"Signup trigger did not create a profile for {user_id}")
        return profile

    yield _make

    purge_users(created_user_ids)


@pytest.fixture
def auth_headers_for(seeded_profile):
    def _headers(role: str):
        profile = seeded_profile(role)
        return {"Authorization": f"Bearer {make_token(str(profile.id))}"}

    return _headers

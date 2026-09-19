import uuid
import time
import pytest
import httpx
from jose import jwt
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.db.session import SessionLocal
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
        "exp": datetime.utcnow() + exp_delta,
    }
    return jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")


@pytest.fixture
def supabase_admin():
    """A small client for calling Supabase's Auth Admin API directly."""
    base_url = f"{settings.supabase_url}/auth/v1/admin"
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }
    return httpx.Client(base_url=base_url, headers=headers, timeout=10)


@pytest.fixture
def seeded_profile(supabase_admin, db_session):
    """
    Creates a REAL Supabase Auth user (via the Admin API) with the given role
    in its metadata. The Day 11 trigger fires automatically and creates the
    matching `profiles` row. Returns that profile. Cleans up the auth user
    (and its profile, via ON DELETE CASCADE) after the test.
    """
    created_user_ids = []

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

        # The trigger fires async-ish on insert but within the same transaction
        # in practice it's immediate; poll briefly just in case.
        profile = None
        for _ in range(10):
            profile = db_session.query(Profile).filter(Profile.id == user_id).first()
            if profile:
                break
            time.sleep(0.2)
            db_session.expire_all()

        if not profile:
            raise RuntimeError(f"Profile was not created by trigger for user {user_id}")

        return profile

    yield _make

    # Teardown: delete the auth users created during this test
    for user_id in created_user_ids:
        supabase_admin.delete(f"/users/{user_id}")


@pytest.fixture
def auth_headers_for(seeded_profile):
    def _headers(role: str):
        profile = seeded_profile(role)
        token = make_token(str(profile.id))
        return {"Authorization": f"Bearer {token}"}
    return _headers

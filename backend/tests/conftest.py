import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from datetime import time as dtime
from datetime import timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.core.clock import local_now_naive
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.user_purge import purge_users
from app.main import app
from app.models.profile import Profile

WEEK = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
ALWAYS_OPEN = {day: [{"start": "06:00", "end": "23:00"}] for day in WEEK}


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
def user_id_of():
    def _user_id(headers):
        return jwt.get_unverified_claims(headers["Authorization"].split(" ")[1])["sub"]

    return _user_id


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
    Creates REAL Supabase auth users (the sign-up trigger creates their profiles) and removes
    them, plus everything that references them, after the test.
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

        # The trigger only allows PLAYER / VENUE_OWNER from sign-up metadata, so ADMIN
        # test users are promoted directly in the database (like a real system would).
        if profile.role != role:
            profile.role = role
            db_session.commit()
        return profile

    yield _make

    purge_users(created_user_ids)


@pytest.fixture
def auth_headers_for(seeded_profile):
    def _headers(role: str):
        profile = seeded_profile(role)
        return {"Authorization": f"Bearer {make_token(str(profile.id))}"}

    return _headers


@pytest.fixture
def new_match(client):
    """Creates a match in the future (Cambodia local time). Returns (match_id, start_datetime)."""

    def _new(creator_headers, *, players_needed=1, days_ahead=7, hour=19, sport="Badminton"):
        start_date = (local_now_naive() + timedelta(days=days_ahead)).date()
        response = client.post(
            "/api/v1/matches",
            json={
                "sport": sport,
                "location": "Phnom Penh",
                "date": start_date.isoformat(),
                "time": f"{hour:02d}:00:00",
                "players_needed": players_needed,
                "skill_level": "BEGINNER",
            },
            headers=creator_headers,
        )
        assert response.status_code == 201, response.text
        return response.json()["id"], datetime.combine(start_date, dtime(hour, 0))

    return _new


@pytest.fixture
def fire_concurrently():
    """
    calls: list of dicts {method, url, headers, json}. All requests are released at the same
    moment, each from its own TestClient (no `with`, so startup events don't run again).
    """

    def _fire(calls):
        barrier = threading.Barrier(len(calls))

        def worker(call):
            thread_client = TestClient(app)
            barrier.wait()
            return thread_client.request(
                call["method"], call["url"], headers=call.get("headers"), json=call.get("json")
            )

        with ThreadPoolExecutor(max_workers=len(calls)) as pool:
            return list(pool.map(worker, calls))

    return _fire


@pytest.fixture
def make_approved_venue(client, auth_headers_for):
    """Registers, 'pays for' and admin-approves a venue. Returns (owner_headers, venue_json)."""

    def _make(owner_headers=None, name="Central Hall"):
        owner = owner_headers or auth_headers_for("VENUE_OWNER")
        admin = auth_headers_for("ADMIN")
        created = client.post(
            "/api/v1/venues", json={"name": name, "address": "123 Main St, Phnom Penh"}, headers=owner
        )
        assert created.status_code == 201, created.text
        venue_id = created.json()["id"]
        assert client.post(f"/api/v1/venues/{venue_id}/confirm-payment", headers=owner).status_code == 200
        approved = client.post(f"/api/v1/admin/venues/{venue_id}/approve", headers=admin)
        assert approved.status_code == 200, approved.text
        return owner, approved.json()

    return _make


@pytest.fixture
def make_court(client):
    def _make(owner_headers, venue_id, *, name="Court 1", sport="Badminton", availability=ALWAYS_OPEN):
        response = client.post(
            f"/api/v1/venues/{venue_id}/courts",
            json={"name": name, "sport": sport, "availability": availability},
            headers=owner_headers,
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _make

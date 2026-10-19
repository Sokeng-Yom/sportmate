import httpx
from sqlalchemy import text

from app.core.config import settings

TEST_PASSWORD = "TestPassword123!"


def real_access_token(db, user_id: str) -> str:
    """Signs a seeded test user in through Supabase Auth and returns a REAL access token."""
    email = db.execute(
        text("select email from auth.users where id = cast(:id as uuid)"), {"id": user_id}
    ).scalar()
    response = httpx.post(
        f"{settings.supabase_url}/auth/v1/token?grant_type=password",
        headers={"apikey": settings.supabase_anon_key},
        json={"email": email, "password": TEST_PASSWORD},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["access_token"]

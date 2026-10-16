import base64
import uuid

import httpx
import pytest

from app.core.config import settings
from tests.supabase_helpers import real_access_token

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)
BASE = f"{settings.supabase_url}/storage/v1/object"


def _upload(token, bucket, path, content=PNG, mime="image/png"):
    return httpx.post(
        f"{BASE}/{bucket}/{path}",
        headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}", "Content-Type": mime},
        content=content,
        timeout=20,
    )


@pytest.fixture
def uploaded():
    """Remembers uploads so they are deleted afterwards with the service role."""
    paths: list[tuple[str, str]] = []
    yield paths
    key = settings.supabase_service_role_key
    for bucket, path in paths:
        httpx.delete(f"{BASE}/{bucket}/{path}", headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=20)


def test_users_can_only_upload_avatars_to_their_own_folder(auth_headers_for, db_session, user_id_of, uploaded):
    me, other = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    token = real_access_token(db_session, user_id_of(me))

    mine = f"{user_id_of(me)}/{uuid.uuid4().hex[:8]}.png"
    assert _upload(token, "avatars", mine).status_code == 200
    uploaded.append(("avatars", mine))
    assert httpx.get(f"{BASE}/public/avatars/{mine}", timeout=20).status_code == 200  # public read, no login

    theirs = f"{user_id_of(other)}/{uuid.uuid4().hex[:8]}.png"
    assert _upload(token, "avatars", theirs).status_code >= 400
    assert _upload(token, "avatars", f"{uuid.uuid4().hex[:8]}.png").status_code >= 400  # outside any user folder


def test_avatar_type_and_size_limits(auth_headers_for, db_session, user_id_of, uploaded):
    me = auth_headers_for("PLAYER")
    token = real_access_token(db_session, user_id_of(me))
    folder = user_id_of(me)

    assert _upload(token, "avatars", f"{folder}/note.txt", content=b"hello", mime="text/plain").status_code >= 400
    assert _upload(token, "avatars", f"{folder}/big.png", content=PNG + b"0" * (2 * 1024 * 1024 + 10)).status_code >= 400


def test_only_the_venue_owner_can_upload_venue_photos(auth_headers_for, make_approved_venue, db_session, user_id_of, uploaded):
    owner, venue = make_approved_venue()
    intruder, player = auth_headers_for("VENUE_OWNER"), auth_headers_for("PLAYER")
    path = f"{venue['id']}/{uuid.uuid4().hex[:8]}.png"

    assert _upload(real_access_token(db_session, user_id_of(intruder)), "venue-photos", path).status_code >= 400
    assert _upload(real_access_token(db_session, user_id_of(player)), "venue-photos", path).status_code >= 400
    assert _upload(real_access_token(db_session, user_id_of(owner)), "venue-photos", path).status_code == 200
    uploaded.append(("venue-photos", path))
    assert httpx.get(f"{BASE}/public/venue-photos/{path}", timeout=20).status_code == 200

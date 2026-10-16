"""
Row Level Security check. Supabase Realtime applies the same RLS policies as Supabase's REST
Data API, so querying the Data API with real user tokens proves what each user could ever receive.
Requires supabase/005_chat_rls_realtime.sql to have been applied.
"""
import httpx

from app.core.config import settings
from tests.supabase_helpers import real_access_token


def _read_messages(token: str, conversation_id: str) -> httpx.Response:
    return httpx.get(
        f"{settings.supabase_url}/rest/v1/messages",
        params={"select": "id,content", "conversation_id": f"eq.{conversation_id}"},
        headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
        timeout=15,
    )


def test_row_level_security_limits_who_can_read_messages(client, auth_headers_for, new_match, db_session, user_id_of):
    creator, joiner, outsider = (auth_headers_for("PLAYER") for _ in range(3))
    match_id, _ = new_match(creator, players_needed=3)
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=joiner).status_code == 200
    assert client.post(
        f"/api/v1/matches/{match_id}/messages", json={"content": "secret plan"}, headers=creator
    ).status_code == 201
    conversation_id = client.get(f"/api/v1/matches/{match_id}/chat", headers=creator).json()["conversation_id"]

    tokens = {name: real_access_token(db_session, user_id_of(h)) for name, h in
              (("creator", creator), ("joiner", joiner), ("outsider", outsider))}

    for name, expected_rows in (("creator", 1), ("joiner", 1), ("outsider", 0)):
        response = _read_messages(tokens[name], conversation_id)
        assert response.status_code == 200, f"{name}: {response.text}"
        assert len(response.json()) == expected_rows, name

    # leaving the match removes access immediately
    assert client.post(f"/api/v1/matches/{match_id}/leave", headers=joiner).status_code == 200
    assert _read_messages(tokens["joiner"], conversation_id).json() == []

    # the public anon key alone gets nothing
    anonymous = _read_messages(settings.supabase_anon_key, conversation_id)
    assert not (anonymous.status_code == 200 and anonymous.json())

import uuid
from datetime import timedelta

from app.core.clock import local_now_naive


def _notes(client, headers, unread_only=False):
    url = "/api/v1/notifications?page_size=100" + ("&unread_only=true" if unread_only else "")
    return client.get(url, headers=headers).json()


def _types(client, headers):
    return [n["type"] for n in _notes(client, headers)["items"]]


def test_joining_notifies_the_creator_and_a_full_match_notifies_everyone(client, auth_headers_for, new_match, user_id_of):
    creator, joiner = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=1)
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=joiner).status_code == 200

    creator_notes = _notes(client, creator)["items"]
    assert sorted(n["type"] for n in creator_notes) == ["MATCH_FULL", "MATCH_PLAYER_JOINED"]
    joined = [n for n in creator_notes if n["type"] == "MATCH_PLAYER_JOINED"][0]
    assert joined["payload"]["match_id"] == match_id
    assert joined["payload"]["user_id"] == user_id_of(joiner) and joined["payload"]["user_name"] == "Test PLAYER"
    assert _types(client, joiner) == ["MATCH_FULL"]  # the joiner is not told about their own join


def test_leaving_notifies_the_others(client, auth_headers_for, new_match):
    creator, joiner = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=3)
    client.post(f"/api/v1/matches/{match_id}/join", headers=joiner)
    client.post(f"/api/v1/matches/{match_id}/leave", headers=joiner)

    left = [n for n in _notes(client, creator)["items"] if n["type"] == "MATCH_PLAYER_LEFT"]
    assert len(left) == 1 and left[0]["payload"]["risk_level"] == "NORMAL"
    assert "MATCH_PLAYER_LEFT" not in _types(client, joiner)


def test_waiting_list_offer_is_notified_with_a_utc_expiry(client, auth_headers_for, new_match):
    creator, filler, waiter = (auth_headers_for("PLAYER") for _ in range(3))
    match_id, _ = new_match(creator, players_needed=1)
    client.post(f"/api/v1/matches/{match_id}/join", headers=filler)
    entry_id = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=waiter).json()["id"]
    assert "WAITING_LIST_OFFER" not in _types(client, waiter)

    client.post(f"/api/v1/matches/{match_id}/leave", headers=filler)
    offer = [n for n in _notes(client, waiter)["items"] if n["type"] == "WAITING_LIST_OFFER"][0]
    assert offer["payload"]["entry_id"] == entry_id and offer["payload"]["match_id"] == match_id
    assert offer["payload"]["expires_at"].endswith("Z")


def test_critical_leave_notifies_the_restriction(client, auth_headers_for):
    creator, leaver = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    soon = local_now_naive() + timedelta(hours=1)
    match = client.post("/api/v1/matches", json={
        "sport": "Badminton", "location": "Phnom Penh", "date": soon.date().isoformat(),
        "time": soon.time().isoformat(), "players_needed": 3, "skill_level": "BEGINNER",
    }, headers=creator).json()
    client.post(f"/api/v1/matches/{match['id']}/join", headers=leaver)
    client.post(f"/api/v1/matches/{match['id']}/leave", headers=leaver)

    restricted = [n for n in _notes(client, leaver)["items"] if n["type"] == "ACCOUNT_RESTRICTED"]
    assert len(restricted) == 1 and "until" in restricted[0]["payload"]


def test_reading_notifications(client, auth_headers_for, new_match):
    creator, joiner, stranger = (auth_headers_for("PLAYER") for _ in range(3))
    match_id, _ = new_match(creator, players_needed=1)
    client.post(f"/api/v1/matches/{match_id}/join", headers=joiner)

    page = _notes(client, creator)
    assert page["unread_count"] == 2 and page["total"] == 2
    first_id = page["items"][0]["id"]

    assert client.post(f"/api/v1/notifications/{first_id}/read", headers=stranger).status_code == 404
    marked = client.post(f"/api/v1/notifications/{first_id}/read", headers=creator)
    assert marked.status_code == 200 and marked.json()["read"] is True
    assert _notes(client, creator)["unread_count"] == 1
    assert len(_notes(client, creator, unread_only=True)["items"]) == 1

    assert client.post("/api/v1/notifications/read-all", headers=creator).json() == {"marked": 1}
    assert _notes(client, creator)["unread_count"] == 0
    assert client.post(f"/api/v1/notifications/{uuid.uuid4()}/read", headers=creator).status_code == 404
    assert _notes(client, stranger)["total"] == 0

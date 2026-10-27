import uuid

import pytest

from app.models.system import SecurityLog


def _join(client, match_id, headers):
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=headers).status_code == 200


def _send(client, match_id, headers, text="hello"):
    return client.post(f"/api/v1/matches/{match_id}/messages", json={"content": text}, headers=headers)


def test_creator_and_joined_players_can_chat(client, auth_headers_for, new_match, user_id_of):
    creator, player = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=3)
    _join(client, match_id, player)

    sent = _send(client, match_id, player, "  see you at 7  ")
    assert sent.status_code == 201, sent.text
    assert sent.json()["content"] == "see you at 7"  # trimmed
    assert sent.json()["sender_id"] == user_id_of(player)
    assert sent.json()["sender_name"] == "Test PLAYER"

    for headers in (creator, player):
        page = client.get(f"/api/v1/matches/{match_id}/messages", headers=headers).json()
        assert [m["content"] for m in page["items"]] == ["see you at 7"]
        assert page["has_more"] is False


def test_chat_info_lists_the_members_with_names(client, auth_headers_for, new_match, user_id_of):
    creator, player = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=3)
    _join(client, match_id, player)

    info = client.get(f"/api/v1/matches/{match_id}/chat", headers=player).json()
    assert {m["user_id"] for m in info["members"]} == {user_id_of(creator), user_id_of(player)}
    assert [m["user_id"] for m in info["members"] if m["is_creator"]] == [user_id_of(creator)]
    assert all(m["name"] == "Test PLAYER" for m in info["members"])
    again = client.get(f"/api/v1/matches/{match_id}/chat", headers=creator).json()
    assert again["conversation_id"] == info["conversation_id"]  # one conversation per match


def test_unread_messages_count_and_mark_read_are_per_user_and_conversation(
    client, auth_headers_for, new_match
):
    creator, player, outsider = (
        auth_headers_for("PLAYER"),
        auth_headers_for("PLAYER"),
        auth_headers_for("PLAYER"),
    )
    match_id, _ = new_match(creator, players_needed=3)
    _join(client, match_id, player)
    unread_url = "/api/v1/matches/chat/unread-count"

    assert client.get(unread_url, headers=creator).json()["unread_count"] == 0
    assert _send(client, match_id, player).status_code == 201
    assert client.get(unread_url, headers=creator).json()["unread_count"] == 1
    assert client.get(unread_url, headers=player).json()["unread_count"] == 0

    assert client.post(f"/api/v1/matches/{match_id}/chat/read", headers=creator).status_code == 200
    assert client.get(unread_url, headers=creator).json()["unread_count"] == 0

    assert _send(client, match_id, creator, "reply").status_code == 201
    assert client.get(unread_url, headers=player).json()["unread_count"] == 1
    assert client.post(f"/api/v1/matches/{match_id}/chat/read", headers=player).status_code == 200
    assert client.get(unread_url, headers=player).json()["unread_count"] == 0
    assert client.get(unread_url, headers=outsider).json()["unread_count"] == 0
    assert client.post(f"/api/v1/matches/{match_id}/chat/read", headers=outsider).status_code == 403


def test_non_participants_are_locked_out_and_logged(client, auth_headers_for, new_match, db_session, user_id_of):
    creator, outsider = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=3)
    _send(client, match_id, creator, "private")

    assert client.get(f"/api/v1/matches/{match_id}/messages", headers=outsider).status_code == 403
    assert client.get(f"/api/v1/matches/{match_id}/chat", headers=outsider).status_code == 403
    assert _send(client, match_id, outsider, "let me in").status_code == 403

    db_session.expire_all()
    denied = (
        db_session.query(SecurityLog)
        .filter(SecurityLog.action == "CHAT_ACCESS_DENIED", SecurityLog.user_id == uuid.UUID(user_id_of(outsider)))
        .count()
    )
    assert denied == 3


def test_leaving_the_match_removes_chat_access(client, auth_headers_for, new_match):
    creator, player = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=3)
    _join(client, match_id, player)
    assert _send(client, match_id, player).status_code == 201

    assert client.post(f"/api/v1/matches/{match_id}/leave", headers=player).status_code == 200
    assert client.get(f"/api/v1/matches/{match_id}/messages", headers=player).status_code == 403
    assert _send(client, match_id, player).status_code == 403


def test_message_validation(client, auth_headers_for, new_match):
    creator = auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=2)
    for bad in ("", "   ", "x" * 1001):
        assert _send(client, match_id, creator, bad).status_code == 422
    assert client.post(f"/api/v1/matches/{match_id}/messages", json={}, headers=creator).status_code == 422
    assert _send(client, match_id, creator, "x" * 1000).status_code == 201


def test_unknown_match_is_404(client, auth_headers_for):
    player = auth_headers_for("PLAYER")
    assert client.get(f"/api/v1/matches/{uuid.uuid4()}/messages", headers=player).status_code == 404


def test_cancelled_matches_keep_history_but_close_the_chat(client, auth_headers_for, new_match):
    creator = auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=2)
    _send(client, match_id, creator, "before")
    assert client.patch(f"/api/v1/matches/{match_id}/cancel", headers=creator).status_code == 200

    assert _send(client, match_id, creator, "after").status_code == 400
    history = client.get(f"/api/v1/matches/{match_id}/messages", headers=creator).json()
    assert [m["content"] for m in history["items"]] == ["before"]


def test_history_is_paged_with_a_cursor(client, auth_headers_for, new_match):
    creator = auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=2)
    for i in range(5):
        assert _send(client, match_id, creator, f"m{i}").status_code == 201

    url = f"/api/v1/matches/{match_id}/messages"
    latest = client.get(f"{url}?limit=2", headers=creator).json()
    assert [m["content"] for m in latest["items"]] == ["m3", "m4"]  # oldest first within the page
    assert latest["has_more"] is True

    older = client.get(url, params={"limit": 2, "before": latest["items"][0]["created_at"]}, headers=creator).json()
    assert [m["content"] for m in older["items"]] == ["m1", "m2"]
    assert older["has_more"] is True

    oldest = client.get(url, params={"limit": 2, "before": older["items"][0]["created_at"]}, headers=creator).json()
    assert [m["content"] for m in oldest["items"]] == ["m0"]
    assert oldest["has_more"] is False


def test_sending_too_fast_is_rate_limited_and_logged(
    client, auth_headers_for, new_match, monkeypatch, db_session, user_id_of
):
    monkeypatch.setattr("app.api.v1.chat.MESSAGE_RATE_LIMIT", 3)
    creator = auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=2)

    assert [_send(client, match_id, creator, f"m{i}").status_code for i in range(3)] == [201, 201, 201]
    blocked = _send(client, match_id, creator, "too many")
    assert blocked.status_code == 429

    db_session.expire_all()
    logged = (
        db_session.query(SecurityLog)
        .filter(SecurityLog.action == "CHAT_RATE_LIMITED", SecurityLog.user_id == uuid.UUID(user_id_of(creator)))
        .count()
    )
    assert logged == 1


def test_two_simultaneous_first_visits_create_one_conversation(client, auth_headers_for, new_match, fire_concurrently):
    creator = auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=2)
    call = {"method": "GET", "url": f"/api/v1/matches/{match_id}/chat", "headers": creator}

    responses = fire_concurrently([call, call, call])
    assert [r.status_code for r in responses] == [200, 200, 200]
    assert len({r.json()["conversation_id"] for r in responses}) == 1

import uuid
from datetime import timedelta

from app.core.clock import local_now_naive, utc_now
from app.models.profile import Profile
from tests.e2e.helpers import notification_types


def test_player_journey_from_sign_up_to_a_booked_match(
    client, auth_headers_for, new_match, make_approved_venue, make_court
):
    sport = f"Journey{uuid.uuid4().hex[:6]}"  # unique, so other data in the database cannot interfere
    host, friend, third, waiter, outsider = (auth_headers_for("PLAYER") for _ in range(5))
    owner, venue = make_approved_venue()
    make_court(owner, venue["id"], sport=sport)

    # 1. profile and sports
    me = client.get("/api/v1/profiles/me", headers=host).json()
    assert me["role"] == "PLAYER" and me["restricted_until"] is None
    for headers in (host, friend):
        added = client.post("/api/v1/profiles/me/sports", json={"sport": sport, "skill_level": "BEGINNER"}, headers=headers)
        assert added.status_code == 201
    assert len(client.get("/api/v1/profiles/me/sports", headers=friend).json()) == 1

    # 2. the host creates a match that needs two more players; 3. the friend finds it by matchmaking
    match_id, start = new_match(host, players_needed=2, sport=sport)
    found = client.get(f"/api/v1/matches/recommended?sport={sport}", headers=friend).json()
    assert match_id in [m["id"] for m in found["items"]] and found["items"][0]["score"] > 0.9
    assert client.get(f"/api/v1/matches/recommended?sport={sport}", headers=host).json()["total"] == 0  # not their own

    # 4. joining: OPEN, then FULL
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=friend).json()["status"] == "OPEN"
    assert "MATCH_PLAYER_JOINED" in notification_types(client, host)
    assert client.get(f"/api/v1/matches/recommended?sport={sport}", headers=friend).json()["total"] == 0  # already in
    full = client.post(f"/api/v1/matches/{match_id}/join", headers=third).json()
    assert full["status"] == "FULL" and len(full["players"]) == 2
    for headers in (host, friend, third):
        assert "MATCH_FULL" in notification_types(client, headers)

    # 5. chat is for participants only
    texts = ["Court booked soon!", "I'm in", "See you there"]
    for headers, text in zip((host, friend, third), texts):
        assert client.post(f"/api/v1/matches/{match_id}/messages", json={"content": text}, headers=headers).status_code == 201
    history = client.get(f"/api/v1/matches/{match_id}/messages", headers=third).json()
    assert [m["content"] for m in history["items"]] == texts
    assert client.get(f"/api/v1/matches/{match_id}/messages", headers=outsider).status_code == 403

    # 6. find a free court and book it
    day = start.date().isoformat()
    search = f"/api/v1/courts/search?date={day}&start_time=19:00:00&sport={sport}&location={venue['name']}"
    courts = client.get(search, headers=host).json()
    assert courts["total"] == 1
    booked = client.post("/api/v1/bookings", json={"match_id": match_id, "court_id": courts["items"][0]["id"]}, headers=host)
    assert booked.status_code == 201, booked.text
    after_booking = client.get(f"/api/v1/matches/{match_id}", headers=host).json()
    assert after_booking["status"] == "CONFIRMED", after_booking
    for headers in (host, friend, third):
        assert "BOOKING_CONFIRMED" in notification_types(client, headers)
    assert client.get(search, headers=host).json()["total"] == 0  # the slot is taken now

    # 7. a late joiner waits; a player leaves without penalty; the slot goes to the waiter
    entry = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=waiter)
    assert entry.status_code == 201 and entry.json()["position"] == 1
    assert client.post(f"/api/v1/matches/{match_id}/leave", headers=third).status_code == 200
    assert client.get("/api/v1/profiles/me", headers=third).json()["restricted_until"] is None
    assert "WAITING_LIST_OFFER" in notification_types(client, waiter)
    assert client.post(f"/api/v1/waiting-list/{entry.json()['id']}/accept", headers=waiter).status_code == 200
    detail = client.get(f"/api/v1/matches/{match_id}", headers=host).json()
    assert detail["status"] == "CONFIRMED", detail
    assert len(detail["players"]) == 2, detail

    # 8. community and the notification bell
    post = client.post("/api/v1/posts", json={"content": "Great game tonight!"}, headers=friend).json()
    assert client.post(f"/api/v1/posts/{post['id']}/like", headers=host).json()["like_count"] == 1
    assert client.post(f"/api/v1/posts/{post['id']}/comments", json={"content": "Rematch?"}, headers=host).status_code == 201
    shown = client.get(f"/api/v1/posts/{post['id']}", headers=friend).json()
    assert (shown["like_count"], shown["comment_count"]) == (1, 1)
    bell = client.get("/api/v1/notifications", headers=friend).json()
    assert bell["unread_count"] >= 2
    assert client.post("/api/v1/notifications/read-all", headers=friend).json()["marked"] == bell["unread_count"]
    assert client.get("/api/v1/notifications", headers=friend).json()["unread_count"] == 0


def test_player_who_cancels_at_the_last_minute_is_restricted_then_recovers(
    client, auth_headers_for, new_match, db_session, user_id_of
):
    host, flaky = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    soon = local_now_naive() + timedelta(hours=1)
    match = client.post("/api/v1/matches", json={
        "sport": "Badminton", "location": "Phnom Penh", "date": soon.date().isoformat(),
        "time": soon.time().isoformat(timespec="seconds"), "players_needed": 3, "skill_level": "BEGINNER",
    }, headers=host).json()
    assert client.post(f"/api/v1/matches/{match['id']}/join", headers=flaky).status_code == 200

    preview = client.get(f"/api/v1/matches/{match['id']}/leave-risk-preview", headers=flaky).json()
    assert preview["risk_level"] == "CRITICAL" and preview["will_restrict"] is True
    assert client.post(f"/api/v1/matches/{match['id']}/leave", headers=flaky).status_code == 200

    assert client.get("/api/v1/profiles/me", headers=flaky).json()["restricted_until"] is not None
    assert "ACCOUNT_RESTRICTED" in notification_types(client, flaky)
    next_match, _ = new_match(host, players_needed=2)
    blocked = client.post(f"/api/v1/matches/{next_match}/join", headers=flaky)
    assert blocked.status_code == 403 and "restricted" in blocked.json()["detail"]

    db_session.expire_all()  # three days pass
    profile = db_session.query(Profile).filter(Profile.id == user_id_of(flaky)).one()
    profile.restricted_until = utc_now() - timedelta(minutes=1)
    db_session.commit()
    assert client.post(f"/api/v1/matches/{next_match}/join", headers=flaky).status_code == 200

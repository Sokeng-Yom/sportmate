import uuid
from datetime import datetime, timedelta
from uuid import UUID

from app.models.booking import Booking
from app.models.match import Match


def test_create_match(client, auth_headers_for):
    response = client.post(
        "/api/v1/matches",
        json={"sport": "Badminton", "location": "Phnom Penh", "date": "2026-11-01", "time": "19:00:00", "players_needed": 4, "skill_level": "INTERMEDIATE"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 201
    assert response.json()["status"] == "OPEN"


def test_match_list_includes_host_name(client, auth_headers_for, new_match):
    host = auth_headers_for("PLAYER")
    match_id, _ = new_match(host)

    response = client.get("/api/v1/matches?created_by_me=true", headers=host)

    assert response.status_code == 200, response.text
    match = next(item for item in response.json()["items"] if item["id"] == match_id)
    assert match["host_name"] == "Test PLAYER"


def test_cancelled_matches_are_hidden_from_default_lists_but_retained(
    client, auth_headers_for, new_match, db_session
):
    host = auth_headers_for("PLAYER")
    match_id, _ = new_match(host)

    cancelled = client.patch(f"/api/v1/matches/{match_id}/cancel", headers=host)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"

    default_list = client.get("/api/v1/matches", headers=host)
    assert default_list.status_code == 200
    assert all(item["id"] != match_id for item in default_list.json()["items"])

    cancelled_list = client.get("/api/v1/matches?status=CANCELLED", headers=host)
    assert cancelled_list.status_code == 200
    assert any(item["id"] == match_id for item in cancelled_list.json()["items"])

    stored_match = db_session.query(Match).filter(Match.id == uuid.UUID(match_id)).one()
    assert stored_match.status == "CANCELLED"


def test_match_creator_can_edit_match_but_other_users_cannot(client, auth_headers_for, new_match):
    host_headers = auth_headers_for("PLAYER")
    match_id, _ = new_match(host_headers, players_needed=3)

    response = client.patch(
        f"/api/v1/matches/{match_id}",
        json={
            "sport": "Tennis",
            "location": "Updated court",
            "date": "2020-01-01",
            "time": "20:00",
            "players_needed": 4,
            "skill_level": "ADVANCED",
        },
        headers=host_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["sport"] == "Tennis"
    assert response.json()["location"] == "Updated court"
    assert response.json()["date"] == "2020-01-01"
    assert response.json()["players_needed"] == 4
    assert response.json()["skill_level"] == "ADVANCED"

    rejected = client.patch(
        f"/api/v1/matches/{match_id}",
        json={"location": "Not the host"},
        headers=auth_headers_for("VENUE_OWNER"),
    )
    assert rejected.status_code == 403


def test_players_needed_is_additional_to_the_host(client, auth_headers_for, new_match, db_session):
    host = auth_headers_for("PLAYER")
    match_id, _ = new_match(host, players_needed=2)

    host_joined = client.post(f"/api/v1/matches/{match_id}/join", headers=host)
    assert host_joined.status_code == 200
    assert host_joined.json()["status"] == "OPEN"
    db_session.query(Match).filter(Match.id == match_id).update({"status": "FULL"})
    db_session.commit()

    first_player = client.post(
        f"/api/v1/matches/{match_id}/join",
        headers=auth_headers_for("PLAYER"),
    )
    assert first_player.status_code == 200
    assert first_player.json()["status"] == "OPEN"

    second_player = client.post(
        f"/api/v1/matches/{match_id}/join",
        headers=auth_headers_for("PLAYER"),
    )
    assert second_player.status_code == 200
    assert second_player.json()["status"] == "FULL"

    extra_player = client.post(
        f"/api/v1/matches/{match_id}/join",
        headers=auth_headers_for("PLAYER"),
    )
    assert extra_player.status_code == 400


def test_pending_court_booking_does_not_block_remaining_player_slots(
    client, auth_headers_for, new_match, db_session, make_approved_venue, make_court, user_id_of
):
    host = auth_headers_for("PLAYER")
    first_player = auth_headers_for("PLAYER")
    second_player = auth_headers_for("PLAYER")
    match_id, start = new_match(host, players_needed=2)
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])

    assert client.post(f"/api/v1/matches/{match_id}/join", headers=host).status_code == 200
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=first_player).status_code == 200

    db_session.query(Match).filter(Match.id == match_id).update({"status": "FULL"})
    db_session.add(
        Booking(
            id=uuid.uuid4(),
            court_id=UUID(court["id"]),
            match_id=UUID(match_id),
            booked_by=UUID(user_id_of(host)),
            start_time=start,
            end_time=start + timedelta(minutes=60),
            status="PENDING",
        )
    )
    db_session.commit()

    second_join = client.post(f"/api/v1/matches/{match_id}/join", headers=second_player)
    assert second_join.status_code == 200, second_join.text
    assert second_join.json()["status"] == "FULL"


def test_match_court_selection_shows_booking_review_status(
    client, auth_headers_for, make_approved_venue, make_court
):
    owner_headers, venue = make_approved_venue()
    court = make_court(owner_headers, venue["id"])
    headers = auth_headers_for("PLAYER")

    response = client.post(
        "/api/v1/matches",
        json={
            "sport": "Badminton",
            "location": venue["name"],
            "date": "2026-11-01",
            "time": "19:00:00",
            "players_needed": 1,
            "skill_level": "INTERMEDIATE",
            "court_id": court["id"],
            "court_duration_minutes": 90,
        },
        headers=headers,
    )

    assert response.status_code == 201, response.text
    assert response.json()["court_id"] == court["id"]
    assert response.json()["court_name"] == court["name"]
    assert response.json()["venue_id"] == venue["id"]
    assert response.json()["venue_name"] == venue["name"]
    assert response.json()["court_booking_status"] == "AVAILABLE"
    listed = client.get("/api/v1/matches?created_by_me=true", headers=headers)
    assert listed.status_code == 200
    listed_match = next(item for item in listed.json()["items"] if item["id"] == response.json()["id"])
    assert listed_match["court_name"] == court["name"]
    assert listed_match["court_booking_status"] == "AVAILABLE"

    match_id = response.json()["id"]
    joined = client.post(f"/api/v1/matches/{match_id}/join", headers=headers)
    assert joined.status_code == 200, joined.text
    wrong_duration = client.post(
        "/api/v1/bookings",
        json={"match_id": match_id, "court_id": court["id"], "duration_minutes": 60},
        headers=headers,
    )
    assert wrong_duration.status_code == 400
    booking = client.post(
        "/api/v1/bookings",
        json={"match_id": match_id, "court_id": court["id"], "duration_minutes": 90},
        headers=headers,
    )
    assert booking.status_code == 201, booking.text
    assert booking.json()["status"] == "PENDING"
    listed_after_booking = client.get("/api/v1/matches?created_by_me=true", headers=headers)
    assert listed_after_booking.status_code == 200
    listed_after_booking_match = next(
        item for item in listed_after_booking.json()["items"] if item["id"] == match_id
    )
    assert listed_after_booking_match["court_booking_status"] == "PENDING"
    assert client.get(f"/api/v1/matches/{match_id}", headers=headers).json()["court_booking_status"] == "PENDING"
    approved = client.post(
        f"/api/v1/bookings/{booking.json()['id']}/approve",
        headers=owner_headers,
    )
    assert approved.status_code == 200, approved.text
    confirmed = client.get(f"/api/v1/matches/{match_id}", headers=headers)
    assert confirmed.status_code == 200
    assert confirmed.json()["court_name"] == court["name"]
    assert confirmed.json()["venue_name"] == venue["name"]
    assert confirmed.json()["court_booking_status"] == "CONFIRMED"


def test_create_match_rejects_mismatched_court_selection(client, auth_headers_for, make_approved_venue, make_court):
    owner_headers, venue = make_approved_venue()
    court = make_court(owner_headers, venue["id"])
    response = client.post(
        "/api/v1/matches",
        json={
            "sport": "Tennis",
            "location": venue["name"],
            "date": "2026-11-01",
            "time": "19:00:00",
            "players_needed": 4,
            "skill_level": "INTERMEDIATE",
            "court_id": court["id"],
            "court_duration_minutes": 90,
        },
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 400


def test_list_matches_filtered_by_sport(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    client.post("/api/v1/matches", json={"sport": "Badminton", "location": "Phnom Penh", "date": "2026-11-01", "time": "19:00:00", "players_needed": 4, "skill_level": "BEGINNER"}, headers=headers)
    client.post("/api/v1/matches", json={"sport": "Tennis", "location": "Phnom Penh", "date": "2026-11-01", "time": "19:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    response = client.get("/api/v1/matches?sport=Badminton", headers=headers)
    assert response.status_code == 200
    assert all(m["sport"] == "Badminton" for m in response.json()["items"])


def test_list_matches_filters_by_skill_level_case_insensitively(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    for level in ("BEGINNER", "ADVANCED"):
        response = client.post(
            "/api/v1/matches",
            json={
                "sport": "Tennis",
                "location": "Phnom Penh",
                "date": "2026-11-01",
                "time": "19:00:00",
                "players_needed": 4,
                "skill_level": level,
            },
            headers=headers,
        )
        assert response.status_code == 201, response.text

    response = client.get(
        "/api/v1/matches?skill_level=advanced&created_by_me=true",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["skill_level"] == "ADVANCED"


def test_list_matches_can_sort_by_posted_time(client, auth_headers_for, db_session):
    headers = auth_headers_for("PLAYER")
    first = client.post(
        "/api/v1/matches",
        json={
            "sport": "Tennis",
            "location": "Phnom Penh",
            "date": "2026-12-20",
            "time": "19:00:00",
            "players_needed": 4,
            "skill_level": "BEGINNER",
        },
        headers=headers,
    ).json()
    second = client.post(
        "/api/v1/matches",
        json={
            "sport": "Tennis",
            "location": "Phnom Penh",
            "date": "2026-12-15",
            "time": "19:00:00",
            "players_needed": 4,
            "skill_level": "BEGINNER",
        },
        headers=headers,
    ).json()

    db_session.query(Match).filter(Match.id == first["id"]).update(
        {"created_at": datetime(2026, 1, 1, 12, 0)}
    )
    db_session.query(Match).filter(Match.id == second["id"]).update(
        {"created_at": datetime(2026, 1, 2, 12, 0)}
    )
    db_session.commit()

    response = client.get(
        "/api/v1/matches?created_by_me=true&sort_by=posted_at&page_size=100",
        headers=headers,
    )

    assert response.status_code == 200
    assert [match["id"] for match in response.json()["items"]] == [second["id"], first["id"]]


def test_get_unknown_match_404(client, auth_headers_for):
    response = client.get("/api/v1/matches/00000000-0000-0000-0000-000000000000", headers=auth_headers_for("PLAYER"))
    assert response.status_code == 404


def test_players_needed_minimum_enforced(client, auth_headers_for):
    response = client.post(
        "/api/v1/matches",
        json={"sport": "Badminton", "location": "Phnom Penh", "date": "2026-11-01", "time": "19:00:00", "players_needed": 0, "skill_level": "BEGINNER"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 422

def test_match_date_filter(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    client.post("/api/v1/matches", json={"sport": "Golf", "location": "Siem Reap", "date": "2026-12-15", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)
    client.post("/api/v1/matches", json={"sport": "Golf", "location": "Siem Reap", "date": "2026-12-20", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    response = client.get("/api/v1/matches?date=2026-12-15", headers=headers)
    assert all(m["date"] == "2026-12-15" for m in response.json()["items"])


def test_match_location_filter_partial_match(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    client.post("/api/v1/matches", json={"sport": "Volleyball", "location": "Central Court, Phnom Penh", "date": "2026-12-01", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    response = client.get("/api/v1/matches?location=Phnom Penh", headers=headers)
    assert any("Phnom Penh" in m["location"] for m in response.json()["items"])


def test_pagination_respects_page_size(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    for i in range(5):
        client.post("/api/v1/matches", json={"sport": "Chess", "location": f"Venue {i}", "date": "2026-12-01", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    response = client.get("/api/v1/matches?sport=Chess&page=1&page_size=2", headers=headers)
    data = response.json()
    assert len(data["items"]) == 2
    assert data["page_size"] == 2
    assert data["total"] >= 5


def test_pagination_page_2_returns_different_items(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    for i in range(5):
        client.post("/api/v1/matches", json={"sport": "Darts", "location": f"Venue {i}", "date": "2026-12-01", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    page_1 = client.get("/api/v1/matches?sport=Darts&page=1&page_size=2", headers=headers).json()
    page_2 = client.get("/api/v1/matches?sport=Darts&page=2&page_size=2", headers=headers).json()
    page_1_ids = {m["id"] for m in page_1["items"]}
    page_2_ids = {m["id"] for m in page_2["items"]}
    assert page_1_ids.isdisjoint(page_2_ids)


def test_invalid_date_format_rejected(client, auth_headers_for):
    response = client.post(
        "/api/v1/matches",
        json={"sport": "Badminton", "location": "Phnom Penh", "date": "not-a-date", "time": "19:00:00", "players_needed": 2, "skill_level": "BEGINNER"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 422


def test_match_detail_includes_players_list(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    joiner = auth_headers_for("PLAYER")

    create = client.post("/api/v1/matches", json={"sport": "Badminton", "location": "Phnom Penh", "date": "2026-12-01", "time": "19:00:00", "players_needed": 3, "skill_level": "BEGINNER"}, headers=creator)
    match_id = create.json()["id"]
    client.post(f"/api/v1/matches/{match_id}/join", headers=joiner)

    response = client.get(f"/api/v1/matches/{match_id}", headers=creator)
    assert len(response.json()["players"]) == 1


def test_list_matches_includes_joined_count(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    joiner = auth_headers_for("PLAYER")
    create = client.post(
        "/api/v1/matches",
        json={
            "sport": "Badminton",
            "location": "Phnom Penh",
            "date": "2026-12-01",
            "time": "19:00:00",
            "players_needed": 3,
            "skill_level": "BEGINNER",
        },
        headers=creator,
    )
    match_id = create.json()["id"]
    client.post(f"/api/v1/matches/{match_id}/join", headers=joiner)

    response = client.get("/api/v1/matches?created_by_me=true", headers=creator)
    listed_match = next(item for item in response.json()["items"] if item["id"] == match_id)
    assert listed_match["joined_count"] == 1


def test_list_matches_count_excludes_host_from_other_player_count(client, auth_headers_for):
    creator, first_player, second_player = (
        auth_headers_for("PLAYER"),
        auth_headers_for("PLAYER"),
        auth_headers_for("PLAYER"),
    )
    create = client.post(
        "/api/v1/matches",
        json={
            "sport": "Badminton",
            "location": "Phnom Penh",
            "date": "2026-12-01",
            "time": "19:00:00",
            "players_needed": 4,
            "skill_level": "BEGINNER",
        },
        headers=creator,
    )
    match_id = create.json()["id"]

    for headers in (creator, first_player, second_player):
        joined = client.post(f"/api/v1/matches/{match_id}/join", headers=headers)
        assert joined.status_code == 200, joined.text

    response = client.get("/api/v1/matches?created_by_me=true", headers=creator)
    listed_match = next(item for item in response.json()["items"] if item["id"] == match_id)
    assert listed_match["joined_count"] == 3
    assert listed_match["joined_count_excluding_host"] == 2


def test_list_matches_can_include_open_and_full_statuses(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    joiner = auth_headers_for("PLAYER")
    create = client.post(
        "/api/v1/matches",
        json={
            "sport": "Badminton",
            "location": "Phnom Penh",
            "date": "2026-12-01",
            "time": "19:00:00",
            "players_needed": 1,
            "skill_level": "BEGINNER",
        },
        headers=creator,
    )
    match_id = create.json()["id"]
    client.post(f"/api/v1/matches/{match_id}/join", headers=joiner)

    response = client.get(
        "/api/v1/matches?status=OPEN%2CFULL&created_by_me=true",
        headers=creator,
    )
    listed_match = next(item for item in response.json()["items"] if item["id"] == match_id)
    assert listed_match["status"] == "FULL"
    assert listed_match["joined_count"] == 1
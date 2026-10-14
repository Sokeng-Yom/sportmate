import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.clock import local_now_naive
from app.models.booking import Booking
from app.models.system import Notification, SecurityLog


def _full_match(client, new_match, creator, filler, **kwargs):
    match_id, start = new_match(creator, players_needed=1, **kwargs)
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=filler).status_code == 200
    return match_id, start


def _book(client, headers, match_id, court_id, duration=60):
    return client.post(
        "/api/v1/bookings",
        json={"match_id": match_id, "court_id": court_id, "duration_minutes": duration},
        headers=headers,
    )


@pytest.fixture
def booking_setup(auth_headers_for, make_approved_venue, make_court):
    """An approved venue with one always-open Badminton court, plus two players."""
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])
    return {
        "owner": owner,
        "venue": venue,
        "court": court,
        "creator": auth_headers_for("PLAYER"),
        "filler": auth_headers_for("PLAYER"),
    }


def test_participant_books_a_court_for_a_full_match(client, new_match, booking_setup, db_session, user_id_of):
    s = booking_setup
    match_id, start = _full_match(client, new_match, s["creator"], s["filler"])

    response = _book(client, s["creator"], match_id, s["court"]["id"])
    assert response.status_code == 201, response.text
    booking = response.json()
    assert booking["status"] == "CONFIRMED"
    assert booking["start_time"] == start.isoformat()
    assert booking["court_name"] == "Court 1"
    assert client.get(f"/api/v1/matches/{match_id}", headers=s["creator"]).json()["status"] == "CONFIRMED"

    db_session.expire_all()
    for headers in (s["creator"], s["filler"]):
        count = (
            db_session.query(Notification)
            .filter(
                Notification.user_id == uuid.UUID(user_id_of(headers)),
                Notification.type == "BOOKING_CONFIRMED",
            )
            .count()
        )
        assert count == 1
    logged = (
        db_session.query(SecurityLog)
        .filter(SecurityLog.action == "COURT_BOOKING", SecurityLog.details.like(f"match_id={match_id}%"))
        .count()
    )
    assert logged == 1


def test_only_participants_can_book(client, new_match, booking_setup, auth_headers_for):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    assert _book(client, auth_headers_for("PLAYER"), match_id, s["court"]["id"]).status_code == 403
    assert _book(client, s["filler"], match_id, s["court"]["id"]).status_code == 201  # joined players may book


def test_match_must_be_full(client, new_match, booking_setup):
    s = booking_setup
    match_id, _ = new_match(s["creator"], players_needed=2)
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=s["filler"]).status_code == 200  # 1 of 2
    response = _book(client, s["creator"], match_id, s["court"]["id"])
    assert response.status_code == 400
    assert "full" in response.json()["detail"].lower()


def test_a_match_cannot_be_booked_twice(client, new_match, booking_setup, make_court):
    s = booking_setup
    second_court = make_court(s["owner"], s["venue"]["id"], name="Court 2")
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    assert _book(client, s["creator"], match_id, s["court"]["id"]).status_code == 201
    assert _book(client, s["creator"], match_id, second_court["id"]).status_code == 400


def test_court_must_match_sport_and_opening_hours(client, new_match, booking_setup, make_court):
    s = booking_setup
    tennis = make_court(s["owner"], s["venue"]["id"], name="Tennis court", sport="Tennis")
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    assert _book(client, s["creator"], match_id, tennis["id"]).status_code == 400

    night_id, _ = _full_match(client, new_match, s["creator"], s["filler"], hour=3)  # court opens at 06:00
    assert _book(client, s["creator"], night_id, s["court"]["id"]).status_code == 400


def test_unknown_court_is_404(client, new_match, booking_setup):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    assert _book(client, s["creator"], match_id, str(uuid.uuid4())).status_code == 404


def test_overlapping_slot_is_409_but_back_to_back_is_fine(client, new_match, booking_setup, auth_headers_for):
    s = booking_setup
    other_creator, other_filler = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")

    first, _ = _full_match(client, new_match, s["creator"], s["filler"], days_ahead=8, hour=19)
    same_time, _ = _full_match(client, new_match, other_creator, other_filler, days_ahead=8, hour=19)
    next_hour, _ = _full_match(client, new_match, other_creator, other_filler, days_ahead=8, hour=20)

    assert _book(client, s["creator"], first, s["court"]["id"]).status_code == 201
    assert _book(client, other_creator, same_time, s["court"]["id"]).status_code == 409
    assert _book(client, other_creator, next_hour, s["court"]["id"]).status_code == 201  # 20:00 starts when 19:00 ends


def test_simultaneous_bookings_of_the_same_slot_only_one_succeeds(
    client, new_match, booking_setup, auth_headers_for, fire_concurrently
):
    s = booking_setup
    creators = [auth_headers_for("PLAYER") for _ in range(4)]
    fillers = [auth_headers_for("PLAYER") for _ in range(4)]
    match_ids = [
        _full_match(client, new_match, c, f, days_ahead=9, hour=19)[0] for c, f in zip(creators, fillers)
    ]

    responses = fire_concurrently([
        {
            "method": "POST",
            "url": "/api/v1/bookings",
            "headers": creator,
            "json": {"match_id": match_id, "court_id": s["court"]["id"], "duration_minutes": 60},
        }
        for creator, match_id in zip(creators, match_ids)
    ])

    assert sorted(r.status_code for r in responses) == [201, 409, 409, 409]


def test_double_clicking_book_for_one_match_books_it_once(client, new_match, booking_setup, make_court, fire_concurrently):
    s = booking_setup
    second_court = make_court(s["owner"], s["venue"]["id"], name="Court 2")
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])

    responses = fire_concurrently([
        {"method": "POST", "url": "/api/v1/bookings", "headers": s["creator"],
         "json": {"match_id": match_id, "court_id": court["id"], "duration_minutes": 60}}
        for court in (s["court"], second_court)
    ])
    assert sorted(r.status_code for r in responses) == [201, 400]


def test_database_itself_rejects_overlapping_confirmed_bookings(
    db_session, make_approved_venue, make_court, user_id_of
):
    owner, venue = make_approved_venue()
    court_id = uuid.UUID(make_court(owner, venue["id"])["id"])
    owner_id = uuid.UUID(user_id_of(owner))
    base = datetime(2030, 1, 1, 19, 0)

    def booking(start_min, end_min, status="CONFIRMED"):
        return Booking(
            id=uuid.uuid4(), court_id=court_id, booked_by=owner_id, status=status,
            start_time=base + timedelta(minutes=start_min), end_time=base + timedelta(minutes=end_min),
        )

    db_session.add(booking(0, 60))
    db_session.commit()

    db_session.add(booking(30, 90))  # overlaps -> the exclusion constraint must refuse it
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(booking(60, 120))  # back-to-back is fine
    db_session.add(booking(0, 60, status="CANCELLED"))  # cancelled bookings do not block the slot
    db_session.commit()


def test_cancelling_frees_the_slot_and_reopens_the_match(client, new_match, booking_setup, auth_headers_for):
    s = booking_setup
    other_creator, other_filler = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    first, _ = _full_match(client, new_match, s["creator"], s["filler"], days_ahead=10, hour=19)
    second, _ = _full_match(client, new_match, other_creator, other_filler, days_ahead=10, hour=19)

    booking = _book(client, s["creator"], first, s["court"]["id"]).json()
    assert _book(client, other_creator, second, s["court"]["id"]).status_code == 409

    cancelled = client.post(f"/api/v1/bookings/{booking['id']}/cancel", headers=s["creator"])
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"
    assert client.get(f"/api/v1/matches/{first}", headers=s["creator"]).json()["status"] == "FULL"
    assert client.post(f"/api/v1/bookings/{booking['id']}/cancel", headers=s["creator"]).status_code == 400

    assert _book(client, other_creator, second, s["court"]["id"]).status_code == 201  # slot is free again


def test_only_the_booker_or_the_venue_owner_can_cancel(client, new_match, booking_setup, auth_headers_for):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    booking = _book(client, s["creator"], match_id, s["court"]["id"]).json()
    url = f"/api/v1/bookings/{booking['id']}/cancel"

    assert client.post(url, headers=s["filler"]).status_code == 403
    assert client.post(url, headers=auth_headers_for("PLAYER")).status_code == 403
    assert client.post(url, headers=auth_headers_for("VENUE_OWNER")).status_code == 403
    assert client.post(url, headers=s["owner"]).status_code == 200


def test_my_bookings_lists_the_players_of_the_match_only(client, new_match, booking_setup, auth_headers_for):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    booking = _book(client, s["creator"], match_id, s["court"]["id"]).json()

    for headers in (s["creator"], s["filler"]):
        ids = [b["id"] for b in client.get("/api/v1/bookings", headers=headers).json()["items"]]
        assert booking["id"] in ids
    stranger_ids = [b["id"] for b in client.get("/api/v1/bookings", headers=auth_headers_for("PLAYER")).json()["items"]]
    assert booking["id"] not in stranger_ids


def test_venue_owner_sees_the_venues_bookings(client, new_match, booking_setup, make_approved_venue):
    s = booking_setup
    match_id, start = _full_match(client, new_match, s["creator"], s["filler"], days_ahead=11)
    booking = _book(client, s["creator"], match_id, s["court"]["id"]).json()
    url = f"/api/v1/venues/{s['venue']['id']}/bookings"

    listing = client.get(f"{url}?date={start.date().isoformat()}", headers=s["owner"]).json()
    assert [b["id"] for b in listing["items"]] == [booking["id"]]
    other_day = (start + timedelta(days=1)).date().isoformat()
    assert client.get(f"{url}?date={other_day}", headers=s["owner"]).json()["total"] == 0

    other_owner, _ = make_approved_venue()
    assert client.get(url, headers=other_owner).status_code == 403
    assert client.get(url, headers=s["creator"]).status_code == 403


def test_court_search_only_returns_free_matching_courts(client, new_match, booking_setup, make_court):
    s = booking_setup
    make_court(s["owner"], s["venue"]["id"], name="Tennis court", sport="Tennis")
    day = (local_now_naive() + timedelta(days=12)).date().isoformat()
    token = s["venue"]["name"]
    base = f"/api/v1/courts/search?date={day}&location={token}"
    free = f"{base}&start_time=19:00:00&sport=Badminton"

    found = client.get(free, headers=s["creator"]).json()
    assert [c["id"] for c in found["items"]] == [s["court"]["id"]]
    assert found["items"][0]["venue_name"] == token

    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"], days_ahead=12, hour=19)
    assert _book(client, s["creator"], match_id, s["court"]["id"]).status_code == 201
    assert client.get(free, headers=s["creator"]).json()["total"] == 0                       # now taken
    assert client.get(f"{base}&start_time=20:00:00&sport=Badminton", headers=s["creator"]).json()["total"] == 1
    assert client.get(f"{base}&start_time=03:00:00&sport=Badminton", headers=s["creator"]).json()["total"] == 0  # closed
    assert client.get(f"{base}&start_time=19:00:00&sport=Tennis", headers=s["creator"]).json()["total"] == 1     # taken too


def test_court_search_validates_its_input(client, auth_headers_for):
    player = auth_headers_for("PLAYER")
    past = (local_now_naive() - timedelta(days=1)).date().isoformat()
    future = (local_now_naive() + timedelta(days=5)).date().isoformat()
    assert client.get(f"/api/v1/courts/search?date={past}&start_time=19:00:00", headers=player).status_code == 400
    assert client.get(f"/api/v1/courts/search?date={future}&start_time=23:30:00", headers=player).status_code == 400
    assert client.get("/api/v1/courts/search?start_time=19:00:00", headers=player).status_code == 422

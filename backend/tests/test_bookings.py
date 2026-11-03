import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.clock import local_now_naive
from app.models.booking import Booking, BookingTransaction
from app.models.system import Notification, SecurityLog
from app.models.venue_marketing import VenueDiscount


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


def _approve(client, headers, booking_id):
    return client.post(f"/api/v1/bookings/{booking_id}/approve", headers=headers)


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


def test_participant_books_a_court_for_a_full_match(
    client, new_match, booking_setup, db_session, user_id_of
):
    s = booking_setup
    match_id, start = _full_match(client, new_match, s["creator"], s["filler"])

    response = _book(client, s["creator"], match_id, s["court"]["id"])
    assert response.status_code == 201, response.text
    booking = response.json()
    assert booking["status"] == "PENDING"
    venue_bookings = client.get(
        f"/api/v1/venues/{s['venue']['id']}/bookings",
        headers=s["owner"],
    )
    assert venue_bookings.status_code == 200, venue_bookings.text
    listed_booking = next(
        item for item in venue_bookings.json()["items"] if item["id"] == booking["id"]
    )
    assert listed_booking["status"] == "PENDING"
    assert (
        client.get(f"/api/v1/matches/{match_id}", headers=s["creator"]).json()["status"] == "FULL"
    )

    owner_notifications = client.get("/api/v1/notifications", headers=s["owner"]).json()["items"]
    assert any(n["type"] == "BOOKING_REQUESTED" for n in owner_notifications)

    approved = _approve(client, s["owner"], booking["id"])
    assert approved.status_code == 200, approved.text
    booking = approved.json()
    assert booking["status"] == "CONFIRMED"
    assert booking["start_time"] == start.isoformat()
    assert booking["court_name"] == "Court 1"
    assert (
        client.get(f"/api/v1/matches/{match_id}", headers=s["creator"]).json()["status"]
        == "CONFIRMED"
    )
    confirmed_notification = next(
        notification
        for notification in client.get(
            "/api/v1/notifications", headers=s["creator"]
        ).json()["items"]
        if notification["type"] == "BOOKING_CONFIRMED"
    )
    assert confirmed_notification["payload"]["venue_name"] == s["venue"]["name"]
    assert confirmed_notification["payload"]["court_name"] == s["court"]["name"]
    assert confirmed_notification["payload"]["start_time"] == start.isoformat()
    assert confirmed_notification["payload"]["end_time"] == booking["end_time"]
    match_messages = client.get(
        f"/api/v1/matches/{match_id}/messages", headers=s["creator"]
    ).json()["items"]
    assert not any(
        "Your court booking is confirmed." in message["content"]
        for message in match_messages
    )
    direct_conversations = client.get(
        "/api/v1/player/venue-messages", headers=s["creator"]
    )
    assert direct_conversations.status_code == 200, direct_conversations.text
    direct_conversation = next(
        item
        for item in direct_conversations.json()["items"]
        if item["owner_id"] == user_id_of(s["owner"])
    )
    direct_messages = client.get(
        f"/api/v1/player/venue-messages/{direct_conversation['conversation_id']}/messages",
        headers=s["creator"],
    ).json()["items"]
    assert any(
        message["sender_id"] == user_id_of(s["owner"])
        and "Your court booking is confirmed." in message["content"]
        and s["venue"]["name"] in message["content"]
        and s["court"]["name"] in message["content"]
        for message in direct_messages
    )

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
        .filter(
            SecurityLog.action.in_(["COURT_BOOKING_REQUESTED", "COURT_BOOKING_APPROVED"]),
            SecurityLog.details.like(f"%{match_id}%"),
        )
        .count()
    )
    assert logged == 2


def test_only_managing_venue_owner_can_review_booking(
    client, new_match, booking_setup, auth_headers_for
):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    booking = _book(client, s["creator"], match_id, s["court"]["id"]).json()
    url = f"/api/v1/bookings/{booking['id']}/approve"

    assert client.post(url, headers=s["creator"]).status_code == 403
    assert client.post(url, headers=auth_headers_for("VENUE_OWNER")).status_code == 403
    assert _approve(client, s["owner"], booking["id"]).status_code == 200


def test_booking_approval_message_only_reaches_the_requester(
    client, new_match, booking_setup
):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    booking = _book(client, s["filler"], match_id, s["court"]["id"]).json()

    approved = _approve(client, s["owner"], booking["id"])
    assert approved.status_code == 200, approved.text

    requester_conversations = client.get(
        "/api/v1/player/venue-messages", headers=s["filler"]
    ).json()["items"]
    assert len(requester_conversations) == 1
    conversation_id = requester_conversations[0]["conversation_id"]
    messages = client.get(
        f"/api/v1/player/venue-messages/{conversation_id}/messages",
        headers=s["filler"],
    ).json()["items"]
    assert any("Your court booking is confirmed." in message["content"] for message in messages)

    host_conversations = client.get(
        "/api/v1/player/venue-messages", headers=s["creator"]
    ).json()["items"]
    assert host_conversations == []
    assert client.get(
        f"/api/v1/player/venue-messages/{conversation_id}/messages",
        headers=s["creator"],
    ).status_code == 404


def test_venue_owner_can_reject_and_player_can_request_again(
    client, new_match, booking_setup, user_id_of
):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    booking = _book(client, s["creator"], match_id, s["court"]["id"]).json()

    reason = "The court is undergoing maintenance."
    rejected = client.post(
        f"/api/v1/bookings/{booking['id']}/reject",
        json={"reason": reason},
        headers=s["owner"],
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "REJECTED"
    assert (
        client.get(f"/api/v1/matches/{match_id}", headers=s["creator"]).json()[
            "court_booking_status"
        ]
        == "REJECTED"
    )

    notifications = client.get("/api/v1/notifications", headers=s["creator"]).json()["items"]
    rejection = next(n for n in notifications if n["type"] == "BOOKING_REJECTED")
    assert rejection["payload"]["reason"] == reason
    assert rejection["payload"]["venue_name"] == s["venue"]["name"]
    assert rejection["payload"]["court_name"] == s["court"]["name"]
    assert rejection["payload"]["start_time"] == booking["start_time"]
    assert rejection["payload"]["end_time"] == booking["end_time"]
    match_messages = client.get(
        f"/api/v1/matches/{match_id}/messages", headers=s["creator"]
    ).json()["items"]
    assert not any(
        "Your court booking request was declined." in message["content"]
        for message in match_messages
    )
    direct_conversation = next(
        item
        for item in client.get(
            "/api/v1/player/venue-messages", headers=s["creator"]
        ).json()["items"]
        if item["owner_id"] == user_id_of(s["owner"])
    )
    direct_messages = client.get(
        f"/api/v1/player/venue-messages/{direct_conversation['conversation_id']}/messages",
        headers=s["creator"],
    ).json()["items"]
    assert any(
        message["sender_id"] == user_id_of(s["owner"])
        and "Your court booking request was declined." in message["content"]
        and reason in message["content"]
        for message in direct_messages
    )

    retry = _book(client, s["creator"], match_id, s["court"]["id"])
    assert retry.status_code == 201
    assert retry.json()["status"] == "PENDING"


def test_rejection_requires_a_reason(client, new_match, booking_setup):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    booking = _book(client, s["creator"], match_id, s["court"]["id"]).json()

    rejected = client.post(
        f"/api/v1/bookings/{booking['id']}/reject",
        json={"reason": "   "},
        headers=s["owner"],
    )

    assert rejected.status_code == 422
    assert (
        client.get(f"/api/v1/venues/{s['venue']['id']}/bookings", headers=s["owner"])
        .json()["items"][0]["status"]
        == "PENDING"
    )


def test_venue_owner_can_send_real_messages_to_booking_host(
    client, new_match, booking_setup, auth_headers_for, user_id_of
):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    _book(client, s["creator"], match_id, s["court"]["id"])

    inbox = client.get(
        "/api/v1/venue-owner/messages",
        headers=s["owner"],
    )
    assert inbox.status_code == 200, inbox.text
    conversation = next(
        item for item in inbox.json()["items"] if item["host_id"] == user_id_of(s["creator"])
    )
    sent = client.post(
        f"/api/v1/venue-owner/messages/{conversation['conversation_id']}/messages",
        json={"content": "Your booking is being reviewed."},
        headers=s["owner"],
    )
    assert sent.status_code == 201, sent.text
    assert sent.json()["sender_id"] == user_id_of(s["owner"])
    assert (
        client.get("/api/v1/matches/chat/unread-count", headers=s["creator"]).json()[
            "unread_count"
        ]
        == 1
    )

    player_messages = client.get(
        f"/api/v1/matches/{match_id}/messages", headers=s["creator"]
    )
    assert player_messages.status_code == 200
    assert not any(item["id"] == sent.json()["id"] for item in player_messages.json()["items"])
    direct_player_messages = client.get(
        f"/api/v1/player/venue-messages/{conversation['conversation_id']}/messages",
        headers=s["creator"],
    )
    assert direct_player_messages.status_code == 200, direct_player_messages.text
    assert any(
        item["id"] == sent.json()["id"] for item in direct_player_messages.json()["items"]
    )
    assert (
        client.get("/api/v1/matches/chat/unread-count", headers=s["creator"]).json()[
            "unread_count"
        ]
        == 0
    )
    player_reply = client.post(
        f"/api/v1/player/venue-messages/{conversation['conversation_id']}/messages",
        json={"content": "Thank you for the update."},
        headers=s["creator"],
    )
    assert player_reply.status_code == 201, player_reply.text
    assert player_reply.json()["sender_id"] == user_id_of(s["creator"])

    owner_inbox = client.get("/api/v1/venue-owner/messages", headers=s["owner"])
    assert owner_inbox.status_code == 200
    assert any(
        item["conversation_id"] == conversation["conversation_id"]
        for item in owner_inbox.json()["items"]
    )

    other_owner = auth_headers_for("VENUE_OWNER")
    denied = client.get(
        f"/api/v1/venue-owner/messages/{conversation['conversation_id']}/messages",
        headers=other_owner,
    )
    assert denied.status_code == 404
    denied_player = client.get(
        f"/api/v1/player/venue-messages/{conversation['conversation_id']}/messages",
        headers=s["filler"],
    )
    assert denied_player.status_code == 404


def test_cancelling_a_match_with_pending_request_withdraws_it(client, new_match, booking_setup):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    booking = _book(client, s["creator"], match_id, s["court"]["id"]).json()

    cancelled = client.patch(f"/api/v1/matches/{match_id}/cancel", headers=s["creator"])
    assert cancelled.status_code == 200
    venue_bookings = client.get(
        f"/api/v1/venues/{s['venue']['id']}/bookings",
        headers=s["owner"],
    ).json()["items"]
    assert (
        next(item for item in venue_bookings if item["id"] == booking["id"])["status"]
        == "CANCELLED"
    )


def test_only_participants_can_book(client, new_match, booking_setup, auth_headers_for):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    assert _book(client, auth_headers_for("PLAYER"), match_id, s["court"]["id"]).status_code == 403
    assert (
        _book(client, s["filler"], match_id, s["court"]["id"]).status_code == 201
    )  # joined players may book


def test_match_must_be_full(client, new_match, booking_setup):
    s = booking_setup
    match_id, _ = new_match(s["creator"], players_needed=2)
    assert (
        client.post(f"/api/v1/matches/{match_id}/join", headers=s["filler"]).status_code == 200
    )  # 1 of 2
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

    night_id, _ = _full_match(
        client, new_match, s["creator"], s["filler"], hour=3
    )  # court opens at 06:00
    assert _book(client, s["creator"], night_id, s["court"]["id"]).status_code == 400


def test_unknown_court_is_404(client, new_match, booking_setup):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    assert _book(client, s["creator"], match_id, str(uuid.uuid4())).status_code == 404


def test_overlapping_slot_is_409_but_back_to_back_is_fine(
    client, new_match, booking_setup, auth_headers_for
):
    s = booking_setup
    other_creator, other_filler = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")

    first, _ = _full_match(client, new_match, s["creator"], s["filler"], days_ahead=8, hour=19)
    same_time, _ = _full_match(
        client, new_match, other_creator, other_filler, days_ahead=8, hour=19
    )
    next_hour, _ = _full_match(
        client, new_match, other_creator, other_filler, days_ahead=8, hour=20
    )

    first_request = _book(client, s["creator"], first, s["court"]["id"])
    conflicting_request = _book(client, other_creator, same_time, s["court"]["id"])
    next_request = _book(client, other_creator, next_hour, s["court"]["id"])
    assert first_request.status_code == 201
    assert conflicting_request.status_code == 409
    assert next_request.status_code == 201  # Back-to-back requests do not overlap.
    assert _approve(client, s["owner"], first_request.json()["id"]).status_code == 200
    assert _approve(client, s["owner"], next_request.json()["id"]).status_code == 200


def test_simultaneous_bookings_of_the_same_slot_only_one_succeeds(
    client, new_match, booking_setup, auth_headers_for, fire_concurrently
):
    s = booking_setup
    creators = [auth_headers_for("PLAYER") for _ in range(4)]
    fillers = [auth_headers_for("PLAYER") for _ in range(4)]
    match_ids = [
        _full_match(client, new_match, c, f, days_ahead=9, hour=19)[0]
        for c, f in zip(creators, fillers)
    ]

    responses = fire_concurrently(
        [
            {
                "method": "POST",
                "url": "/api/v1/bookings",
                "headers": creator,
                "json": {
                    "match_id": match_id,
                    "court_id": s["court"]["id"],
                    "duration_minutes": 60,
                },
            }
            for creator, match_id in zip(creators, match_ids)
        ]
    )

    assert sorted(r.status_code for r in responses) == [201, 409, 409, 409]
    successful = next(response for response in responses if response.status_code == 201)
    assert _approve(client, s["owner"], successful.json()["id"]).status_code == 200


def test_double_clicking_book_for_one_match_books_it_once(
    client, new_match, booking_setup, make_court, fire_concurrently
):
    s = booking_setup
    second_court = make_court(s["owner"], s["venue"]["id"], name="Court 2")
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])

    responses = fire_concurrently(
        [
            {
                "method": "POST",
                "url": "/api/v1/bookings",
                "headers": s["creator"],
                "json": {"match_id": match_id, "court_id": court["id"], "duration_minutes": 60},
            }
            for court in (s["court"], second_court)
        ]
    )
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
            id=uuid.uuid4(),
            court_id=court_id,
            booked_by=owner_id,
            status=status,
            start_time=base + timedelta(minutes=start_min),
            end_time=base + timedelta(minutes=end_min),
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


def test_cancelling_frees_the_slot_and_reopens_the_match(
    client, new_match, booking_setup, auth_headers_for
):
    s = booking_setup
    other_creator, other_filler = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    first, _ = _full_match(client, new_match, s["creator"], s["filler"], days_ahead=10, hour=19)
    second, _ = _full_match(client, new_match, other_creator, other_filler, days_ahead=10, hour=19)

    booking = _book(client, s["creator"], first, s["court"]["id"]).json()
    blocked_request = _book(client, other_creator, second, s["court"]["id"])
    assert blocked_request.status_code == 409
    assert _approve(client, s["owner"], booking["id"]).status_code == 200

    cancelled = client.post(f"/api/v1/bookings/{booking['id']}/cancel", headers=s["creator"])
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"
    assert client.get(f"/api/v1/matches/{first}", headers=s["creator"]).json()["status"] == "FULL"
    assert (
        client.post(f"/api/v1/bookings/{booking['id']}/cancel", headers=s["creator"]).status_code
        == 400
    )

    other_booking = _book(client, other_creator, second, s["court"]["id"])
    assert other_booking.status_code == 201
    assert (
        _approve(client, s["owner"], other_booking.json()["id"]).status_code == 200
    )  # slot is free again


def test_only_the_booker_or_the_venue_owner_can_cancel(
    client, new_match, booking_setup, auth_headers_for
):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    booking = _book(client, s["creator"], match_id, s["court"]["id"]).json()
    url = f"/api/v1/bookings/{booking['id']}/cancel"

    assert client.post(url, headers=s["filler"]).status_code == 403
    assert client.post(url, headers=auth_headers_for("PLAYER")).status_code == 403
    assert client.post(url, headers=auth_headers_for("VENUE_OWNER")).status_code == 403
    assert client.post(url, headers=s["owner"]).status_code == 200


def test_my_bookings_lists_the_players_of_the_match_only(
    client, new_match, booking_setup, auth_headers_for
):
    s = booking_setup
    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    booking = _book(client, s["creator"], match_id, s["court"]["id"]).json()

    for headers in (s["creator"], s["filler"]):
        ids = [b["id"] for b in client.get("/api/v1/bookings", headers=headers).json()["items"]]
        assert booking["id"] in ids
    stranger_ids = [
        b["id"]
        for b in client.get("/api/v1/bookings", headers=auth_headers_for("PLAYER")).json()["items"]
    ]
    assert booking["id"] not in stranger_ids


def test_venue_owner_sees_the_venues_bookings(
    client, new_match, booking_setup, make_approved_venue
):
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


def test_court_search_only_returns_free_matching_courts(
    client, new_match, booking_setup, make_court
):
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
    booking = _book(client, s["creator"], match_id, s["court"]["id"])
    assert booking.status_code == 201
    assert (
        client.get(free, headers=s["creator"]).json()["total"] == 0
    )  # Pending requests reserve the slot.
    assert _approve(client, s["owner"], booking.json()["id"]).status_code == 200
    assert client.get(free, headers=s["creator"]).json()["total"] == 0
    assert (
        client.get(f"{base}&start_time=20:00:00&sport=Badminton", headers=s["creator"]).json()[
            "total"
        ]
        == 1
    )
    assert (
        client.get(f"{base}&start_time=03:00:00&sport=Badminton", headers=s["creator"]).json()[
            "total"
        ]
        == 0
    )  # closed
    assert (
        client.get(f"{base}&start_time=19:00:00&sport=Tennis", headers=s["creator"]).json()["total"]
        == 1
    )  # taken too


def test_multi_court_booking_is_priced_and_promo_is_validated_server_side(
    client, new_match, booking_setup, make_court, db_session
):
    s = booking_setup
    second = make_court(s["owner"], s["venue"]["id"], name="Court 2", price_per_hour=30)
    promo_response = client.post(
        f"/api/v1/venues/{s['venue']['id']}/discounts",
        json={
            "title": "Twenty percent off",
            "description": "A test promo",
            "percent_off": 20,
            "code": "sport20",
            "valid_until": (local_now_naive().date() + timedelta(days=14)).isoformat(),
            "usage_limit": 2,
        },
        headers=s["owner"],
    )
    assert promo_response.status_code == 201, promo_response.text

    match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
    court_ids = [s["court"]["id"], second["id"]]
    quote = client.post(
        "/api/v1/bookings/quote",
        json={
            "match_id": match_id,
            "court_ids": court_ids,
            "duration_minutes": 60,
            "promo_code": "SPORT20",
        },
        headers=s["creator"],
    )
    assert quote.status_code == 200, quote.text
    assert quote.json()["original_total"] in (50, "50.00")
    assert quote.json()["discount_amount"] in (10, "10.00")
    assert quote.json()["final_total"] in (40, "40.00")

    booking = client.post(
        "/api/v1/bookings",
        json={
            "match_id": match_id,
            "court_id": s["court"]["id"],
            "court_ids": court_ids,
            "duration_minutes": 60,
            "promo_code": "SPORT20",
            "final_total": 0,
        },
        headers=s["creator"],
    )
    assert booking.status_code == 201, booking.text
    body = booking.json()
    assert body["selected_court_names"] == ["Court 1", "Court 2"]
    assert body["original_total"] in (50, "50.00")
    assert body["discount_amount"] in (10, "10.00")
    assert body["final_total"] in (40, "40.00")
    assert (
        db_session.query(Booking).filter(Booking.transaction_id == body["transaction_id"]).count()
        == 2
    )
    assert (
        db_session.query(BookingTransaction).filter_by(id=body["transaction_id"]).one().final_total
        == 40
    )
    stored_promo = db_session.query(VenueDiscount).filter_by(id=promo_response.json()["id"]).one()
    assert stored_promo.usage_count == 1

    venue_bookings = client.get(
        f"/api/v1/venues/{s['venue']['id']}/bookings", headers=s["owner"]
    ).json()["items"]
    assert (
        len([item for item in venue_bookings if item["transaction_id"] == body["transaction_id"]])
        == 2
    )
    assert _approve(client, s["owner"], body["id"]).status_code == 200
    db_session.expire_all()
    assert all(
        item.status == "CONFIRMED"
        for item in db_session.query(Booking).filter_by(transaction_id=body["transaction_id"]).all()
    )


def test_promo_code_rejects_inactive_expired_and_exhausted_codes(
    client, new_match, booking_setup, make_court, db_session
):
    s = booking_setup
    other_court = make_court(s["owner"], s["venue"]["id"], name="Court 2")
    now = local_now_naive().date()
    payloads = [
        ("INACTIVE", now + timedelta(days=3), False, 2),
        ("EXPIRED", now - timedelta(days=1), True, 2),
        ("EXHAUSTED", now + timedelta(days=3), True, 1),
    ]
    for code, valid_until, active, limit in payloads:
        response = client.post(
            f"/api/v1/venues/{s['venue']['id']}/discounts",
            json={
                "title": code,
                "description": "Test promo",
                "percent_off": 10,
                "code": code,
                "valid_until": valid_until.isoformat(),
                "active": active,
                "usage_limit": limit,
            },
            headers=s["owner"],
        )
        assert response.status_code == 201, response.text
        if code == "EXHAUSTED":
            promo = db_session.query(VenueDiscount).filter_by(id=response.json()["id"]).one()
            promo.usage_count = 1
            db_session.commit()
        match_id, _ = _full_match(client, new_match, s["creator"], s["filler"])
        quote = client.post(
            "/api/v1/bookings/quote",
            json={
                "match_id": match_id,
                "court_ids": [other_court["id"]],
                "duration_minutes": 60,
                "promo_code": code,
            },
            headers=s["creator"],
        )
        assert quote.status_code == 400
        reason = (
            "inactive" if code == "INACTIVE" else "expired" if code == "EXPIRED" else "usage limit"
        )
        assert reason in quote.json()["detail"].lower()


def test_court_search_validates_its_input(client, auth_headers_for):
    player = auth_headers_for("PLAYER")
    past = (local_now_naive() - timedelta(days=1)).date().isoformat()
    future = (local_now_naive() + timedelta(days=5)).date().isoformat()
    assert (
        client.get(
            f"/api/v1/courts/search?date={past}&start_time=19:00:00", headers=player
        ).status_code
        == 400
    )
    assert (
        client.get(
            f"/api/v1/courts/search?date={future}&start_time=23:30:00", headers=player
        ).status_code
        == 400
    )
    assert (
        client.get("/api/v1/courts/search?start_time=19:00:00", headers=player).status_code == 422
    )

from datetime import timedelta

import pytest

from app.core.clock import local_now_naive
from app.models.booking import Booking, BookingTransaction


@pytest.fixture
def booking_setup(auth_headers_for, make_approved_venue, make_court):
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])
    return {
        "owner": owner,
        "venue": venue,
        "court": court,
        "creator": auth_headers_for("PLAYER"),
        "filler": auth_headers_for("PLAYER"),
    }


def _confirmed_booking(client, new_match, booking_setup):
    setup = booking_setup
    match_id, _ = new_match(setup["creator"])
    joined = client.post(f"/api/v1/matches/{match_id}/join", headers=setup["filler"])
    assert joined.status_code == 200, joined.text
    requested = client.post(
        "/api/v1/bookings",
        json={"match_id": match_id, "court_id": setup["court"]["id"]},
        headers=setup["creator"],
    )
    assert requested.status_code == 201, requested.text
    approved = client.post(
        f"/api/v1/bookings/{requested.json()['id']}/approve",
        headers=setup["owner"],
    )
    assert approved.status_code == 200, approved.text
    return setup, approved.json()


def test_player_can_review_ended_booking_once_and_owner_can_read_it(
    client, new_match, booking_setup, db_session
):
    setup, booking = _confirmed_booking(client, new_match, booking_setup)
    transaction = db_session.query(BookingTransaction).filter_by(id=booking["transaction_id"]).one()
    start = local_now_naive() - timedelta(hours=2)
    end = local_now_naive() - timedelta(hours=1)
    transaction.start_time = start
    transaction.end_time = end
    db_session.query(Booking).filter_by(transaction_id=transaction.id).update(
        {"start_time": start, "end_time": end}
    )
    db_session.commit()

    eligible = client.get("/api/v1/reviews/eligible", headers=setup["creator"])
    assert eligible.status_code == 200, eligible.text
    assert len(eligible.json()) == 1
    assert eligible.json()[0]["venue_name"] == setup["venue"]["name"]

    payload = {
        "booking_transaction_id": booking["transaction_id"],
        "rating": 5,
        "comment": "Great courts and friendly staff.",
    }
    created = client.post("/api/v1/reviews", json=payload, headers=setup["creator"])
    assert created.status_code == 201, created.text
    assert created.json()["player_name"]
    assert created.json()["venue_name"] == setup["venue"]["name"]

    duplicate = client.post("/api/v1/reviews", json=payload, headers=setup["creator"])
    assert duplicate.status_code == 409
    assert client.get("/api/v1/reviews/eligible", headers=setup["creator"]).json() == []

    owner_reviews = client.get("/api/v1/reviews/owner", headers=setup["owner"])
    assert owner_reviews.status_code == 200, owner_reviews.text
    assert owner_reviews.json()["total"] == 1
    assert owner_reviews.json()["items"][0]["comment"] == payload["comment"]


def test_reviews_require_own_ended_confirmed_booking(
    client, new_match, booking_setup, auth_headers_for
):
    setup, booking = _confirmed_booking(client, new_match, booking_setup)
    payload = {
        "booking_transaction_id": booking["transaction_id"],
        "rating": 4,
        "comment": "Nice.",
    }

    outsider = auth_headers_for("PLAYER")
    assert client.post("/api/v1/reviews", json=payload, headers=outsider).status_code == 403
    assert client.post("/api/v1/reviews", json=payload, headers=setup["creator"]).status_code == 400
    assert client.get("/api/v1/reviews/owner", headers=setup["creator"]).status_code == 403

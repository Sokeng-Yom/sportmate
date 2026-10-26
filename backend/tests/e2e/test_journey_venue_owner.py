import uuid

from tests.conftest import ALWAYS_OPEN, WEEK
from tests.e2e.helpers import notification_types


def test_venue_owner_journey_from_application_to_a_cancelled_booking(
    client, auth_headers_for, new_match
):
    sport = f"Journey{uuid.uuid4().hex[:6]}"
    owner, other_owner, admin = (auth_headers_for(r) for r in ("VENUE_OWNER", "VENUE_OWNER", "ADMIN"))
    host, filler, player = (auth_headers_for("PLAYER") for _ in range(3))
    name = f"Journey Hall {uuid.uuid4().hex[:6]}"

    # 1. apply and pay; nothing can be managed before approval
    venue = client.post("/api/v1/venues", json={"name": name, "address": "St 1, Phnom Penh", "description": "Two courts"}, headers=owner).json()
    vid = venue["id"]
    assert venue["status"] == "PAYMENT_PENDING"
    court_body = {"name": "Court 1", "sport": sport, "availability": ALWAYS_OPEN}
    assert client.post(f"/api/v1/venues/{vid}/courts", json=court_body, headers=owner).status_code == 400
    assert client.post(f"/api/v1/venues/{vid}/confirm-payment", headers=owner).json()["status"] == "PENDING_REVIEW"
    assert client.post(f"/api/v1/venues/{vid}/courts", json=court_body, headers=owner).status_code == 400

    # 2. the admin approves; the owner is told and can edit the venue's details
    assert vid in [v["id"] for v in client.get("/api/v1/admin/venues?status=PENDING_REVIEW&page_size=100", headers=admin).json()["items"]]
    assert client.post(f"/api/v1/admin/venues/{vid}/approve", headers=admin).json()["status"] == "APPROVED"
    assert "VENUE_APPROVED" in notification_types(client, owner)
    edited = client.patch(f"/api/v1/venues/{vid}", json={"description": "Two air-conditioned courts", "photo_url": "https://example.com/p.png"}, headers=owner)
    assert edited.status_code == 200 and edited.json()["photo_url"] == "https://example.com/p.png"
    assert name in [v["name"] for v in client.get(f"/api/v1/venues?q={name}", headers=player).json()["items"]]

    # 3. two courts, the second only open in the mornings at first
    c1 = client.post(f"/api/v1/venues/{vid}/courts", json=court_body, headers=owner).json()
    morning = {day: [{"start": "06:00", "end": "12:00"}] for day in WEEK}
    c2 = client.post(f"/api/v1/venues/{vid}/courts", json={"name": "Court 2", "sport": sport, "availability": morning}, headers=owner).json()

    match_id, start = new_match(host, players_needed=1, sport=sport)
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=filler).status_code == 200
    search = f"/api/v1/courts/search?date={start.date().isoformat()}&start_time=19:00:00&sport={sport}&location={name}"
    count = lambda: client.get(search, headers=host).json()["total"]
    assert count() == 1, client.get(search, headers=host).json()  # only Court 1 is open at 19:00
    evening = {day: [{"start": "17:00", "end": "22:00"}] for day in WEEK}
    assert client.patch(f"/api/v1/courts/{c2['id']}", json={"availability": evening}, headers=owner).status_code == 200
    assert count() == 2

    # 4. the booking shows up for the owner
    booked = client.post("/api/v1/bookings", json={"match_id": match_id, "court_id": c1["id"]}, headers=host)
    assert booked.status_code == 201, booked.text
    booking = booked.json()
    assert count() == 1
    day = start.date().isoformat()
    listing = client.get(f"/api/v1/venues/{vid}/bookings?date={day}", headers=owner).json()
    assert [(b["id"], b["court_name"]) for b in listing["items"]] == [(booking["id"], "Court 1")]

    # 5. other owners are locked out
    assert client.get(f"/api/v1/venues/{vid}/bookings", headers=other_owner).status_code == 403
    assert client.patch(f"/api/v1/venues/{vid}", json={"name": "Hacked"}, headers=other_owner).status_code == 403
    assert client.patch(f"/api/v1/courts/{c1['id']}", json={"name": "Hacked"}, headers=other_owner).status_code == 403

    # 6. the owner cancels: the players are told, the match goes back to FULL, the slot is free again
    cancelled = client.post(f"/api/v1/bookings/{booking['id']}/cancel", headers=owner)
    assert cancelled.status_code == 200 and cancelled.json()["status"] == "CANCELLED"
    assert client.get(f"/api/v1/matches/{match_id}", headers=host).json()["status"] == "FULL"
    for headers in (host, filler):
        assert "BOOKING_CANCELLED" in notification_types(client, headers)
    assert count() == 2


def test_rejected_application_gives_a_clear_state_and_a_second_chance(client, auth_headers_for):
    owner, admin, player = auth_headers_for("VENUE_OWNER"), auth_headers_for("ADMIN"), auth_headers_for("PLAYER")
    name = f"Rejected Hall {uuid.uuid4().hex[:6]}"
    venue = client.post("/api/v1/venues", json={"name": name, "address": "Unknown"}, headers=owner).json()
    client.post(f"/api/v1/venues/{venue['id']}/confirm-payment", headers=owner)

    rejected = client.post(f"/api/v1/admin/venues/{venue['id']}/reject", json={"reason": "Address cannot be verified"}, headers=admin)
    assert rejected.status_code == 200

    mine = {v["id"]: v for v in client.get("/api/v1/venues/mine", headers=owner).json()}
    assert mine[venue["id"]]["status"] == "REJECTED" and mine[venue["id"]]["rejection_reason"] == "Address cannot be verified"
    assert "VENUE_REJECTED" in notification_types(client, owner)
    assert client.post(f"/api/v1/venues/{venue['id']}/courts", json={"name": "C", "sport": "Badminton"}, headers=owner).status_code == 400
    assert client.get(f"/api/v1/venues?q={name}", headers=player).json()["total"] == 0  # never public
    assert client.post("/api/v1/venues", json={"name": "Second try", "address": "Real street 5"}, headers=owner).status_code == 201

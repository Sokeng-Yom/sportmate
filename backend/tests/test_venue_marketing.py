from datetime import timedelta

from app.core.clock import local_now_naive


def test_venue_owner_manages_discounts_and_players_can_browse_them(
    client, auth_headers_for, make_approved_venue
):
    owner, venue = make_approved_venue()
    player = auth_headers_for("PLAYER")
    payload = {
        "title": "Early bird",
        "description": "Save on weekday bookings.",
        "percent_off": 20,
        "code": "EARLY20",
        "valid_until": (local_now_naive().date() + timedelta(days=30)).isoformat(),
    }

    created = client.post(
        f"/api/v1/venues/{venue['id']}/discounts",
        json=payload,
        headers=owner,
    )
    assert created.status_code == 201, created.text
    discount_id = created.json()["id"]

    listed = client.get(f"/api/v1/venues/{venue['id']}/discounts", headers=player)
    assert listed.status_code == 200
    assert listed.json()[0]["title"] == "Early bird"
    browse = client.get("/api/v1/venues/browse?page_size=100", headers=player)
    browse_venue = next(item for item in browse.json()["items"] if item["id"] == venue["id"])
    assert browse_venue["discounts"][0]["id"] == discount_id

    updated = client.patch(
        f"/api/v1/venues/{venue['id']}/discounts/{discount_id}",
        json={"percent_off": 25},
        headers=owner,
    )
    assert updated.status_code == 200
    assert updated.json()["percent_off"] == 25

    assert client.delete(
        f"/api/v1/venues/{venue['id']}/discounts/{discount_id}",
        headers=owner,
    ).status_code == 204
    assert client.get(f"/api/v1/venues/{venue['id']}/discounts", headers=player).json() == []


def test_venue_owner_manages_events_and_players_can_browse_them(
    client, auth_headers_for, make_approved_venue
):
    owner, venue = make_approved_venue()
    player = auth_headers_for("PLAYER")
    payload = {
        "title": "Weekend tournament",
        "description": "Friendly doubles tournament.",
        "event_date": (local_now_naive().date() + timedelta(days=10)).isoformat(),
        "event_time": "09:30",
        "sport": "Badminton",
        "price_label": "$5 / person",
    }

    created = client.post(
        f"/api/v1/venues/{venue['id']}/events",
        json=payload,
        headers=owner,
    )
    assert created.status_code == 201, created.text
    event_id = created.json()["id"]

    listed = client.get(f"/api/v1/venues/{venue['id']}/events", headers=player)
    assert listed.status_code == 200
    assert listed.json()[0]["title"] == "Weekend tournament"
    browse = client.get("/api/v1/venues/browse?page_size=100", headers=player)
    browse_venue = next(item for item in browse.json()["items"] if item["id"] == venue["id"])
    assert browse_venue["events"][0]["id"] == event_id

    updated = client.patch(
        f"/api/v1/venues/{venue['id']}/events/{event_id}",
        json={"price_label": "Free"},
        headers=owner,
    )
    assert updated.status_code == 200
    assert updated.json()["price_label"] == "Free"

    assert client.delete(
        f"/api/v1/venues/{venue['id']}/events/{event_id}",
        headers=owner,
    ).status_code == 204
    assert client.get(f"/api/v1/venues/{venue['id']}/events", headers=player).json() == []


def test_only_venue_owners_can_write_marketing_and_only_for_owned_approved_venues(
    client, auth_headers_for, make_approved_venue
):
    owner, venue = make_approved_venue()
    other_owner = auth_headers_for("VENUE_OWNER")
    player = auth_headers_for("PLAYER")
    discount = {
        "title": "Offer",
        "description": "Description",
        "valid_until": (local_now_naive().date() + timedelta(days=5)).isoformat(),
    }
    event = {
        "title": "Game",
        "description": "Description",
        "event_date": (local_now_naive().date() + timedelta(days=5)).isoformat(),
        "event_time": "18:00",
        "sport": "Football",
        "price_label": "Free",
    }

    for headers in (other_owner, player):
        assert client.post(
            f"/api/v1/venues/{venue['id']}/discounts", json=discount, headers=headers
        ).status_code == 403
        assert client.post(
            f"/api/v1/venues/{venue['id']}/events", json=event, headers=headers
        ).status_code == 403

    pending = client.post(
        "/api/v1/venues",
        json={"name": "Pending venue", "address": "Phnom Penh"},
        headers=owner,
    )
    assert pending.status_code == 201
    assert client.post(
        f"/api/v1/venues/{pending.json()['id']}/discounts",
        json=discount,
        headers=owner,
    ).status_code == 400


def test_marketing_payloads_are_validated(client, auth_headers_for, make_approved_venue):
    owner, venue = make_approved_venue()
    invalid = client.post(
        f"/api/v1/venues/{venue['id']}/discounts",
        json={
            "title": "Too much",
            "description": "Invalid percentage",
            "percent_off": 101,
            "valid_until": (local_now_naive().date() + timedelta(days=5)).isoformat(),
        },
        headers=owner,
    )
    assert invalid.status_code == 422

import uuid


def _court_payload(name="Court 1", sport="Badminton", availability=None):
    return {"name": name, "sport": sport, "availability": availability}


def test_owner_adds_a_court_with_weekly_availability(client, make_approved_venue):
    owner, venue = make_approved_venue()
    response = client.post(
        f"/api/v1/venues/{venue['id']}/courts",
        json=_court_payload(availability={"mon": [{"start": "08:00", "end": "22:00"}]}),
        headers=owner,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["availability"]["mon"] == [{"start": "08:00:00", "end": "22:00:00"}]
    assert body["availability"]["tue"] == []


def test_courts_need_an_approved_venue(client, auth_headers_for):
    owner = auth_headers_for("VENUE_OWNER")
    venue = client.post("/api/v1/venues", json={"name": "New", "address": "x"}, headers=owner).json()
    response = client.post(f"/api/v1/venues/{venue['id']}/courts", json=_court_payload(), headers=owner)
    assert response.status_code == 400


def test_other_owners_and_players_cannot_manage_courts(client, auth_headers_for, make_approved_venue, make_court):
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])
    intruder = auth_headers_for("VENUE_OWNER")

    assert client.post(
        f"/api/v1/venues/{venue['id']}/courts", json=_court_payload(name="Court 2"), headers=intruder
    ).status_code == 403
    assert client.patch(f"/api/v1/courts/{court['id']}", json={"name": "Hacked"}, headers=intruder).status_code == 403
    assert client.patch(
        f"/api/v1/courts/{court['id']}", json={"name": "Hacked"}, headers=auth_headers_for("PLAYER")
    ).status_code == 403


def test_admin_can_manage_any_court(client, auth_headers_for, make_approved_venue, make_court):
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])
    response = client.patch(
        f"/api/v1/courts/{court['id']}", json={"name": "Renamed by admin"}, headers=auth_headers_for("ADMIN")
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Renamed by admin"


def test_duplicate_court_names_are_rejected_per_venue(client, make_approved_venue, make_court):
    owner, venue = make_approved_venue()
    make_court(owner, venue["id"], name="Court 1")
    response = client.post(f"/api/v1/venues/{venue['id']}/courts", json=_court_payload(name="Court 1"), headers=owner)
    assert response.status_code == 400
    other_owner, other_venue = make_approved_venue()
    make_court(other_owner, other_venue["id"], name="Court 1")  # same name in another venue is fine


def test_invalid_availability_is_rejected(client, make_approved_venue):
    owner, venue = make_approved_venue()
    url = f"/api/v1/venues/{venue['id']}/courts"
    overlapping = {"mon": [{"start": "08:00", "end": "12:00"}, {"start": "11:00", "end": "14:00"}]}
    backwards = {"mon": [{"start": "12:00", "end": "08:00"}]}
    unknown_day = {"funday": [{"start": "08:00", "end": "12:00"}]}
    bad_time = {"mon": [{"start": "25:00", "end": "26:00"}]}
    for bad in (overlapping, backwards, unknown_day, bad_time):
        assert client.post(url, json=_court_payload(availability=bad), headers=owner).status_code == 422


def test_availability_can_be_replaced_and_cleared(client, make_approved_venue, make_court):
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])
    url = f"/api/v1/courts/{court['id']}"

    updated = client.patch(url, json={"availability": {"sat": [{"start": "09:00", "end": "17:00"}]}}, headers=owner)
    assert updated.status_code == 200
    assert updated.json()["availability"]["sat"] == [{"start": "09:00:00", "end": "17:00:00"}]
    assert updated.json()["availability"]["mon"] == []

    cleared = client.patch(url, json={"availability": None}, headers=owner)
    assert cleared.json()["availability"] is None
    assert client.patch(url, json={"name": "Centre Court"}, headers=owner).json()["name"] == "Centre Court"


def test_players_can_browse_courts_of_approved_venues(client, auth_headers_for, make_approved_venue, make_court):
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])
    player = auth_headers_for("PLAYER")

    listing = client.get(f"/api/v1/venues/{venue['id']}/courts", headers=player)
    assert listing.status_code == 200
    assert [c["id"] for c in listing.json()] == [court["id"]]
    assert client.get(f"/api/v1/courts/{court['id']}", headers=player).status_code == 200
    assert client.get(f"/api/v1/courts/{uuid.uuid4()}", headers=player).status_code == 404

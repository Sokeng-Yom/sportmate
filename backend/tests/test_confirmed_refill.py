from app.models.waiting_list import WaitingList


def test_a_booked_match_refills_from_the_waiting_list(
    client, auth_headers_for, new_match, make_approved_venue, make_court, db_session
):
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])
    creator, filler, waiter, interloper = (auth_headers_for("PLAYER") for _ in range(4))

    match_id, _ = new_match(creator, players_needed=1)
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=filler).status_code == 200
    booked = client.post("/api/v1/bookings", json={"match_id": match_id, "court_id": court["id"]}, headers=creator)
    assert booked.status_code == 201
    status = lambda: client.get(f"/api/v1/matches/{match_id}", headers=creator).json()["status"]
    assert status() == "CONFIRMED"

    entry = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=waiter)
    assert entry.status_code == 201  # a booked, full match accepts waiters

    assert client.post(f"/api/v1/matches/{match_id}/leave", headers=filler).status_code == 200
    assert status() == "CONFIRMED"  # the court is still booked
    db_session.expire_all()
    assert db_session.query(WaitingList).filter(WaitingList.id == entry.json()["id"]).one().status == "NOTIFIED"

    steal = client.post(f"/api/v1/matches/{match_id}/join", headers=interloper)
    assert steal.status_code == 400 and "reserved" in steal.json()["detail"].lower()

    assert client.post(f"/api/v1/waiting-list/{entry.json()['id']}/accept", headers=waiter).status_code == 200
    detail = client.get(f"/api/v1/matches/{match_id}", headers=creator).json()
    assert detail["status"] == "CONFIRMED" and len(detail["players"]) == 1


def test_a_booked_match_with_a_free_slot_can_be_joined_directly(
    client, auth_headers_for, new_match, make_approved_venue, make_court
):
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])
    creator, filler, newcomer = (auth_headers_for("PLAYER") for _ in range(3))
    match_id, _ = new_match(creator, players_needed=1)
    client.post(f"/api/v1/matches/{match_id}/join", headers=filler)
    client.post("/api/v1/bookings", json={"match_id": match_id, "court_id": court["id"]}, headers=creator)
    client.post(f"/api/v1/matches/{match_id}/leave", headers=filler)  # no waiters, slot is free

    assert client.post(f"/api/v1/matches/{match_id}/join", headers=newcomer).status_code == 200
    assert client.get(f"/api/v1/matches/{match_id}", headers=creator).json()["status"] == "CONFIRMED"

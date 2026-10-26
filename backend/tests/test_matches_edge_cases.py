import uuid
from datetime import timedelta

from app.core.clock import local_now_naive
from app.models.profile import Profile

URL = "/api/v1/matches"


def _payload(**overrides):
    payload = {
        "sport": "Badminton", "location": "Phnom Penh", "date": "2030-01-15", "time": "19:00:00",
        "players_needed": 4, "skill_level": "BEGINNER",
    }
    payload.update(overrides)
    return payload


def _match_in_hours(client, headers, hours, players_needed=3):
    start = local_now_naive() + timedelta(hours=hours)
    response = client.post(
        URL,
        json=_payload(
            date=start.date().isoformat(),
            time=start.time().isoformat(timespec="seconds"),
            players_needed=players_needed,
        ),
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_invalid_match_payloads_are_rejected(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    bad_payloads = [{k: v for k, v in _payload().items() if k != field} for field in _payload()]  # each field missing
    bad_payloads += [
        _payload(players_needed=0), _payload(players_needed=-3), _payload(players_needed=51),
        _payload(players_needed="many"), _payload(skill_level="EXPERT"), _payload(sport="   "),
        _payload(location=""), _payload(date="2030-02-30"), _payload(date="not-a-date"),
        _payload(time="25:00:00"),
    ]
    for payload in bad_payloads:
        assert client.post(URL, json=payload, headers=headers).status_code == 422, payload


def test_boundary_values_are_accepted_and_text_is_cleaned(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    one = client.post(URL, json=_payload(players_needed=1), headers=headers)
    fifty = client.post(URL, json=_payload(players_needed=50), headers=headers)
    padded = client.post(URL, json=_payload(sport="  Badminton ", location="  Phnom Penh  "), headers=headers)
    assert (one.status_code, fifty.status_code, padded.status_code) == (201, 201, 201)
    assert padded.json()["sport"] == "Badminton" and padded.json()["location"] == "Phnom Penh"


def test_lookup_and_listing_input_validation(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    assert client.get(f"{URL}/not-a-uuid", headers=headers).status_code == 422
    assert client.get(f"{URL}/{uuid.uuid4()}", headers=headers).status_code == 404
    for query in ("page=0", "page=-1", "page_size=0", "page_size=101", "date=31-12-2030", "date=abc"):
        assert client.get(f"{URL}?{query}", headers=headers).status_code == 422, query


def test_paging_beyond_the_last_page_returns_nothing_but_the_right_total(client, auth_headers_for, new_match):
    creator = auth_headers_for("PLAYER")
    new_match(creator, sport="Zpagetest")
    page = client.get(f"{URL}?sport=Zpagetest&page=50", headers=creator).json()
    assert page["items"] == [] and page["total"] == 1 and page["page"] == 50


def test_joined_and_created_filters(client, auth_headers_for, new_match):
    host, player = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    hosted, _ = new_match(host, players_needed=3)
    other, _ = new_match(host, players_needed=3, days_ahead=8)
    assert client.post(f"{URL}/{other}/join", headers=player).status_code == 200

    def ids(query, headers):
        return [m["id"] for m in client.get(f"{URL}?{query}&page_size=100", headers=headers).json()["items"]]

    assert ids("joined_by_me=true", player) == [other]
    assert ids("created_by_me=true", player) == []
    assert set(ids("created_by_me=true", host)) == {hosted, other}


def test_cancelled_matches_are_closed_for_everyone(client, auth_headers_for, db_session, user_id_of):
    creator, joiner, late = (auth_headers_for("PLAYER") for _ in range(3))
    match_id = _match_in_hours(client, creator, 1)  # inside the critical window
    assert client.post(f"{URL}/{match_id}/join", headers=joiner).status_code == 200
    assert client.patch(f"{URL}/{match_id}/cancel", headers=creator).status_code == 200

    assert client.patch(f"{URL}/{match_id}/cancel", headers=creator).status_code == 400  # already cancelled
    assert client.post(f"{URL}/{match_id}/join", headers=late).status_code == 400
    assert client.post(f"{URL}/{match_id}/leave", headers=joiner).status_code == 400
    assert client.get(f"{URL}/{match_id}/leave-risk-preview", headers=joiner).status_code == 400

    db_session.expire_all()  # leaving a cancelled match must never restrict the player
    profile = db_session.query(Profile).filter(Profile.id == user_id_of(joiner)).one()
    assert profile.restricted_until is None


def test_cancelling_an_unknown_match_is_404(client, auth_headers_for):
    assert client.patch(f"{URL}/{uuid.uuid4()}/cancel", headers=auth_headers_for("PLAYER")).status_code == 404


def test_cancelling_a_booked_match_frees_the_court(
    client, auth_headers_for, new_match, make_approved_venue, make_court
):
    owner, venue = make_approved_venue()
    court = make_court(owner, venue["id"])
    creator, filler = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=1)
    client.post(f"{URL}/{match_id}/join", headers=filler)
    booking = client.post("/api/v1/bookings", json={"match_id": match_id, "court_id": court["id"]}, headers=creator).json()

    assert client.patch(f"{URL}/{match_id}/cancel", headers=creator).status_code == 200
    cancelled = client.get("/api/v1/bookings?status=CANCELLED", headers=creator).json()["items"]
    assert booking["id"] in [b["id"] for b in cancelled]

    other_creator, other_filler = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    other_match, _ = new_match(other_creator, players_needed=1)  # same date and hour as the first match
    client.post(f"{URL}/{other_match}/join", headers=other_filler)
    rebooked = client.post("/api/v1/bookings", json={"match_id": other_match, "court_id": court["id"]}, headers=other_creator)
    assert rebooked.status_code == 201


def test_an_offer_cannot_be_accepted_after_the_match_was_cancelled(client, auth_headers_for, new_match):
    creator, filler, waiter = (auth_headers_for("PLAYER") for _ in range(3))
    match_id, _ = new_match(creator, players_needed=1)
    client.post(f"{URL}/{match_id}/join", headers=filler)
    entry = client.post(f"{URL}/{match_id}/waiting-list", headers=waiter).json()
    client.post(f"{URL}/{match_id}/leave", headers=filler)  # the waiter now holds an offer
    assert client.patch(f"{URL}/{match_id}/cancel", headers=creator).status_code == 200

    assert client.post(f"/api/v1/waiting-list/{entry['id']}/accept", headers=waiter).status_code == 400

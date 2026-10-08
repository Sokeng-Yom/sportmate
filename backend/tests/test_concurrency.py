import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from fastapi.testclient import TestClient

from app.core.clock import utc_now_naive
from app.main import app


def _create_match(client, headers, players_needed):
    start = utc_now_naive() + timedelta(days=30)
    response = client.post(
        "/api/v1/matches",
        json={
            "sport": "Badminton",
            "location": "Phnom Penh",
            "date": start.date().isoformat(),
            "time": "19:00:00",
            "players_needed": players_needed,
            "skill_level": "BEGINNER",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _fire_concurrently(calls):
    """calls: list of (method, url, headers). Every request is released at the same moment."""
    barrier = threading.Barrier(len(calls))

    def worker(call):
        method, url, headers = call
        thread_client = TestClient(app)  # no `with`: avoids re-running startup events
        barrier.wait()
        return thread_client.request(method, url, headers=headers)

    with ThreadPoolExecutor(max_workers=len(calls)) as pool:
        return list(pool.map(worker, calls))


def _detail(client, headers, match_id):
    return client.get(f"/api/v1/matches/{match_id}", headers=headers).json()


def test_two_simultaneous_joins_for_the_last_slot_only_one_wins(client, auth_headers_for):
    creator, p1, p2 = (auth_headers_for("PLAYER") for _ in range(3))
    match_id = _create_match(client, creator, players_needed=1)

    responses = _fire_concurrently([
        ("POST", f"/api/v1/matches/{match_id}/join", p1),
        ("POST", f"/api/v1/matches/{match_id}/join", p2),
    ])

    assert sorted(r.status_code for r in responses) == [200, 400]
    detail = _detail(client, creator, match_id)
    assert len(detail["players"]) == 1
    assert detail["status"] == "FULL"


def test_five_players_race_for_two_slots(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    racers = [auth_headers_for("PLAYER") for _ in range(5)]
    match_id = _create_match(client, creator, players_needed=2)

    responses = _fire_concurrently(
        [("POST", f"/api/v1/matches/{match_id}/join", h) for h in racers]
    )

    codes = sorted(r.status_code for r in responses)
    assert codes == [200, 200, 400, 400, 400]
    assert len(_detail(client, creator, match_id)["players"]) == 2


def test_same_user_double_clicking_join_only_joins_once(client, auth_headers_for):
    creator, player = (auth_headers_for("PLAYER") for _ in range(2))
    match_id = _create_match(client, creator, players_needed=3)

    responses = _fire_concurrently([
        ("POST", f"/api/v1/matches/{match_id}/join", player),
        ("POST", f"/api/v1/matches/{match_id}/join", player),
    ])

    assert sorted(r.status_code for r in responses) == [200, 400]
    assert len(_detail(client, creator, match_id)["players"]) == 1


def test_simultaneous_waiters_get_distinct_positions(client, auth_headers_for):
    creator, filler, w1, w2 = (auth_headers_for("PLAYER") for _ in range(4))
    match_id = _create_match(client, creator, players_needed=1)
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=filler).status_code == 200

    responses = _fire_concurrently([
        ("POST", f"/api/v1/matches/{match_id}/waiting-list", w1),
        ("POST", f"/api/v1/matches/{match_id}/waiting-list", w2),
    ])

    assert [r.status_code for r in responses] == [201, 201]
    assert sorted(r.json()["position"] for r in responses) == [1, 2]


def test_offered_slot_is_reserved_for_the_waiting_list(client, auth_headers_for):
    creator, filler, waiter, interloper = (auth_headers_for("PLAYER") for _ in range(4))
    match_id = _create_match(client, creator, players_needed=1)

    assert client.post(f"/api/v1/matches/{match_id}/join", headers=filler).status_code == 200
    waitlist = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=waiter)
    assert waitlist.status_code == 201
    entry_id = waitlist.json()["id"]

    assert client.post(f"/api/v1/matches/{match_id}/leave", headers=filler).status_code == 200

    steal = client.post(f"/api/v1/matches/{match_id}/join", headers=interloper)
    assert steal.status_code == 400
    assert "reserved" in steal.json()["detail"].lower()

    accept = client.post(f"/api/v1/waiting-list/{entry_id}/accept", headers=waiter)
    assert accept.status_code == 200
    detail = _detail(client, creator, match_id)
    assert len(detail["players"]) == 1
    assert detail["status"] == "FULL"

def test_create_match(client, auth_headers_for):
    response = client.post(
        "/api/v1/matches",
        json={"sport": "Badminton", "location": "Phnom Penh", "date": "2026-11-01", "time": "19:00:00", "players_needed": 4, "skill_level": "INTERMEDIATE"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 201
    assert response.json()["status"] == "OPEN"


def test_list_matches_filtered_by_sport(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    client.post("/api/v1/matches", json={"sport": "Badminton", "location": "Phnom Penh", "date": "2026-11-01", "time": "19:00:00", "players_needed": 4, "skill_level": "BEGINNER"}, headers=headers)
    client.post("/api/v1/matches", json={"sport": "Tennis", "location": "Phnom Penh", "date": "2026-11-01", "time": "19:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    response = client.get("/api/v1/matches?sport=Badminton", headers=headers)
    assert response.status_code == 200
    assert all(m["sport"] == "Badminton" for m in response.json()["items"])


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

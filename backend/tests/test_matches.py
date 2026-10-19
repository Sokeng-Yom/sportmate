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

def test_match_date_filter(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    client.post("/api/v1/matches", json={"sport": "Golf", "location": "Siem Reap", "date": "2026-12-15", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)
    client.post("/api/v1/matches", json={"sport": "Golf", "location": "Siem Reap", "date": "2026-12-20", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    response = client.get("/api/v1/matches?date=2026-12-15", headers=headers)
    assert all(m["date"] == "2026-12-15" for m in response.json()["items"])


def test_match_location_filter_partial_match(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    client.post("/api/v1/matches", json={"sport": "Volleyball", "location": "Central Court, Phnom Penh", "date": "2026-12-01", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    response = client.get("/api/v1/matches?location=Phnom Penh", headers=headers)
    assert any("Phnom Penh" in m["location"] for m in response.json()["items"])


def test_pagination_respects_page_size(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    for i in range(5):
        client.post("/api/v1/matches", json={"sport": "Chess", "location": f"Venue {i}", "date": "2026-12-01", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    response = client.get("/api/v1/matches?sport=Chess&page=1&page_size=2", headers=headers)
    data = response.json()
    assert len(data["items"]) == 2
    assert data["page_size"] == 2
    assert data["total"] >= 5


def test_pagination_page_2_returns_different_items(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    for i in range(5):
        client.post("/api/v1/matches", json={"sport": "Darts", "location": f"Venue {i}", "date": "2026-12-01", "time": "10:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)

    page_1 = client.get("/api/v1/matches?sport=Darts&page=1&page_size=2", headers=headers).json()
    page_2 = client.get("/api/v1/matches?sport=Darts&page=2&page_size=2", headers=headers).json()
    page_1_ids = {m["id"] for m in page_1["items"]}
    page_2_ids = {m["id"] for m in page_2["items"]}
    assert page_1_ids.isdisjoint(page_2_ids)


def test_invalid_date_format_rejected(client, auth_headers_for):
    response = client.post(
        "/api/v1/matches",
        json={"sport": "Badminton", "location": "Phnom Penh", "date": "not-a-date", "time": "19:00:00", "players_needed": 2, "skill_level": "BEGINNER"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 422


def test_match_detail_includes_players_list(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    joiner = auth_headers_for("PLAYER")

    create = client.post("/api/v1/matches", json={"sport": "Badminton", "location": "Phnom Penh", "date": "2026-12-01", "time": "19:00:00", "players_needed": 3, "skill_level": "BEGINNER"}, headers=creator)
    match_id = create.json()["id"]
    client.post(f"/api/v1/matches/{match_id}/join", headers=joiner)

    response = client.get(f"/api/v1/matches/{match_id}", headers=creator)
    assert len(response.json()["players"]) == 1
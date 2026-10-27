from datetime import date

from app.services.matchmaking import (
    sport_score,
    skill_score,
    availability_score,
    location_score,
    reliability_score,
    compute_match_score,
)


def test_sport_score_match():
    assert sport_score(["Badminton", "Tennis"], "Badminton") == 1.0


def test_sport_score_no_match():
    assert sport_score(["Tennis"], "Badminton") == 0.0


def test_sport_score_case_insensitive():
    assert sport_score(["badminton"], "Badminton") == 1.0


def test_skill_score_exact_match():
    assert skill_score("INTERMEDIATE", "INTERMEDIATE") == 1.0


def test_skill_score_one_level_off():
    assert skill_score("BEGINNER", "INTERMEDIATE") == 0.5
    assert skill_score("ADVANCED", "INTERMEDIATE") == 0.5


def test_skill_score_two_levels_off():
    assert skill_score("BEGINNER", "ADVANCED") == 0.0


def test_skill_score_no_user_skill():
    assert skill_score(None, "INTERMEDIATE") == 0.0


def test_availability_score_unconstrained():
    assert availability_score(None, date(2030, 11, 1)) == 1.0


def test_availability_score_exact_date():
    assert availability_score(date(2030, 11, 1), date(2030, 11, 1)) == 1.0


def test_availability_score_far_date():
    assert availability_score(date(2030, 11, 1), date(2030, 12, 1)) == 0.0


def test_location_score_unconstrained():
    assert location_score(None, "Phnom Penh") == 1.0


def test_location_score_substring_match():
    assert location_score("Phnom Penh", "Central Court, Phnom Penh") == 1.0


def test_location_score_no_match():
    assert location_score("Siem Reap", "Phnom Penh") == 0.0


def test_reliability_score_no_history():
    assert reliability_score(0, 0) == 1.0


def test_reliability_score_all_critical():
    assert reliability_score(3, 3) == 0.0


def test_reliability_score_mixed():
    assert reliability_score(1, 4) == 0.75


def test_compute_match_score_perfect_match():
    score = compute_match_score(
        user_sports=["Badminton"],
        user_skill_level="INTERMEDIATE",
        critical_leave_count=0,
        total_leave_count=0,
        match_sport="Badminton",
        match_skill_level="INTERMEDIATE",
        match_date=date(2030, 11, 1),
        match_location="Phnom Penh",
        preferred_date=date(2030, 11, 1),
        preferred_location="Phnom Penh",
    )
    # 1.0*0.30 + 1.0*0.25 + 1.0*0.20 + 1.0*0.15 + 1.0*0.10 = 1.0
    assert score == 1.0


def test_compute_match_score_no_sport_match_caps_score():
    score = compute_match_score(
        user_sports=["Tennis"],
        user_skill_level=None,
        critical_leave_count=0,
        total_leave_count=0,
        match_sport="Badminton",
        match_skill_level="INTERMEDIATE",
        match_date=date(2030, 11, 1),
        match_location="Phnom Penh",
    )
    # sport=0, skill=0 (no user skill for badminton), availability=1*0.20, location=1*0.15, reliability=1*0.10
    assert score == 0.45

def test_recommended_endpoint_sorted_descending(client, auth_headers_for):
    searcher = auth_headers_for("PLAYER")
    other_creator = auth_headers_for("PLAYER")

    client.post("/api/v1/profiles/me/sports", json={"sport": "Badminton", "skill_level": "INTERMEDIATE"}, headers=searcher)

    client.post("/api/v1/matches", json={"sport": "Badminton", "location": "Phnom Penh", "date": "2030-12-01", "time": "19:00:00", "players_needed": 4, "skill_level": "INTERMEDIATE"}, headers=other_creator)
    client.post("/api/v1/matches", json={"sport": "Badminton", "location": "Siem Reap", "date": "2030-12-01", "time": "19:00:00", "players_needed": 4, "skill_level": "ADVANCED"}, headers=other_creator)

    response = client.get("/api/v1/matches/recommended?sport=Badminton", headers=searcher)
    assert response.status_code == 200
    scores = [m["score"] for m in response.json()["items"]]
    assert scores == sorted(scores, reverse=True)
    assert all("joined_count" in match for match in response.json()["items"])


def test_recommended_endpoint_excludes_own_matches(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    client.post("/api/v1/profiles/me/sports", json={"sport": "Tennis", "skill_level": "BEGINNER"}, headers=headers)
    create = client.post("/api/v1/matches", json={"sport": "Tennis", "location": "Phnom Penh", "date": "2030-12-01", "time": "19:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=headers)
    own_match_id = create.json()["id"]

    response = client.get("/api/v1/matches/recommended?sport=Tennis", headers=headers)
    returned_ids = {m["id"] for m in response.json()["items"]}
    assert own_match_id not in returned_ids


def test_recommended_endpoint_excludes_already_joined(client, auth_headers_for):
    searcher = auth_headers_for("PLAYER")
    creator = auth_headers_for("PLAYER")

    client.post("/api/v1/profiles/me/sports", json={"sport": "Squash", "skill_level": "BEGINNER"}, headers=searcher)
    create = client.post("/api/v1/matches", json={"sport": "Squash", "location": "Phnom Penh", "date": "2030-12-01", "time": "19:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=creator)
    match_id = create.json()["id"]
    client.post(f"/api/v1/matches/{match_id}/join", headers=searcher)

    response = client.get("/api/v1/matches/recommended?sport=Squash", headers=searcher)
    returned_ids = {m["id"] for m in response.json()["items"]}
    assert match_id not in returned_ids


def test_recommended_endpoint_pagination(client, auth_headers_for):
    searcher = auth_headers_for("PLAYER")
    creator = auth_headers_for("PLAYER")
    client.post("/api/v1/profiles/me/sports", json={"sport": "Volleyball", "skill_level": "BEGINNER"}, headers=searcher)

    for i in range(5):
        client.post("/api/v1/matches", json={"sport": "Volleyball", "location": f"Court {i}", "date": "2030-12-01", "time": "19:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=creator)

    response = client.get("/api/v1/matches/recommended?sport=Volleyball&page=1&page_size=2", headers=searcher)
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] >= 5


def test_recommended_endpoint_min_score_filter(client, auth_headers_for):
    searcher = auth_headers_for("PLAYER")
    creator = auth_headers_for("PLAYER")
    # Searcher has no sports logged at all -> every match scores low (no sport match)
    client.post("/api/v1/matches", json={"sport": "Cricket", "location": "Phnom Penh", "date": "2030-12-01", "time": "19:00:00", "players_needed": 2, "skill_level": "BEGINNER"}, headers=creator)

    response = client.get("/api/v1/matches/recommended?sport=Cricket&min_score=0.9", headers=searcher)
    assert response.status_code == 200
    assert response.json()["total"] == 0
from datetime import timedelta

from app.core.clock import utc_now_naive


def _create(client, headers, sport, day_offset):
    day = (utc_now_naive() + timedelta(days=day_offset)).date().isoformat()
    response = client.post(
        "/api/v1/matches",
        json={
            "sport": sport,
            "location": "Phnom Penh",
            "date": day,
            "time": "19:00:00",
            "players_needed": 4,
            "skill_level": "BEGINNER",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return day


def test_recommendations_never_include_past_matches(client, auth_headers_for):
    searcher, creator = (auth_headers_for("PLAYER") for _ in range(2))
    yesterday = _create(client, creator, "Pastball", -1)
    tomorrow = _create(client, creator, "Pastball", 1)

    result = client.get("/api/v1/matches/recommended?sport=Pastball", headers=searcher).json()
    dates = [m["date"] for m in result["items"]]
    assert yesterday not in dates
    assert tomorrow in dates


def test_sport_filter_is_case_insensitive(client, auth_headers_for):
    searcher, creator = (auth_headers_for("PLAYER") for _ in range(2))
    _create(client, creator, "Casebase", 3)

    result = client.get("/api/v1/matches/recommended?sport=casebase", headers=searcher).json()
    assert result["total"] >= 1
    listing = client.get("/api/v1/matches?sport=CASEBASE", headers=searcher).json()
    assert listing["total"] >= 1


def test_equal_scores_are_ordered_soonest_first(client, auth_headers_for):
    searcher, creator = (auth_headers_for("PLAYER") for _ in range(2))
    _create(client, creator, "Tieball", 9)
    _create(client, creator, "Tieball", 2)
    _create(client, creator, "Tieball", 5)

    items = client.get("/api/v1/matches/recommended?sport=Tieball", headers=searcher).json()["items"]
    assert [m["score"] for m in items] == [items[0]["score"]] * 3  # all tied
    assert [m["date"] for m in items] == sorted(m["date"] for m in items)

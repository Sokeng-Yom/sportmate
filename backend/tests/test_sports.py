def test_add_sport(client, auth_headers_for):
    response = client.post(
        "/api/v1/profiles/me/sports",
        json={"sport": "Badminton", "skill_level": "INTERMEDIATE"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 201
    assert response.json()["sport"] == "Badminton"


def test_invalid_skill_level_rejected(client, auth_headers_for):
    response = client.post(
        "/api/v1/profiles/me/sports",
        json={"sport": "Tennis", "skill_level": "PRO"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 422


def test_empty_sport_name_rejected(client, auth_headers_for):
    response = client.post(
        "/api/v1/profiles/me/sports",
        json={"sport": "   ", "skill_level": "BEGINNER"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 422


def test_user_can_have_multiple_sports(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    client.post("/api/v1/profiles/me/sports", json={"sport": "Badminton", "skill_level": "BEGINNER"}, headers=headers)
    client.post("/api/v1/profiles/me/sports", json={"sport": "Tennis", "skill_level": "ADVANCED"}, headers=headers)

    response = client.get("/api/v1/profiles/me/sports", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 2


def test_cannot_modify_another_users_sport(client, auth_headers_for):
    owner_headers = auth_headers_for("PLAYER")
    create = client.post(
        "/api/v1/profiles/me/sports",
        json={"sport": "Squash", "skill_level": "BEGINNER"},
        headers=owner_headers,
    )
    sport_id = create.json()["id"]

    other_headers = auth_headers_for("PLAYER")  # a different seeded user
    response = client.delete(f"/api/v1/profiles/me/sports/{sport_id}", headers=other_headers)
    assert response.status_code == 404

def test_duplicate_sport_for_same_user_allowed_or_rejected(client, auth_headers_for):
    """
    Decide and lock in the behavior: can a user add 'Badminton' twice?
    Currently nothing prevents it - this test documents that as the
    current (intentional-for-now) behavior. Revisit if the frontend
    needs duplicate prevention.
    """
    headers = auth_headers_for("PLAYER")
    first = client.post("/api/v1/profiles/me/sports", json={"sport": "Badminton", "skill_level": "BEGINNER"}, headers=headers)
    second = client.post("/api/v1/profiles/me/sports", json={"sport": "Badminton", "skill_level": "ADVANCED"}, headers=headers)
    assert first.status_code == 201
    assert second.status_code == 201  # currently allowed; two separate rows


def test_sport_name_normalization(client, auth_headers_for):
    response = client.post(
        "/api/v1/profiles/me/sports",
        json={"sport": "  badminton  ", "skill_level": "BEGINNER"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 201
    assert response.json()["sport"] == "Badminton"  # trimmed + title-cased


def test_update_sport_partial_fields(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    create = client.post("/api/v1/profiles/me/sports", json={"sport": "Tennis", "skill_level": "BEGINNER"}, headers=headers)
    sport_id = create.json()["id"]

    # Update only skill_level, leave sport untouched
    response = client.patch(f"/api/v1/profiles/me/sports/{sport_id}", json={"skill_level": "ADVANCED"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["sport"] == "Tennis"
    assert response.json()["skill_level"] == "ADVANCED"


def test_update_sport_invalid_skill_level_rejected(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    create = client.post("/api/v1/profiles/me/sports", json={"sport": "Squash", "skill_level": "BEGINNER"}, headers=headers)
    sport_id = create.json()["id"]

    response = client.patch(f"/api/v1/profiles/me/sports/{sport_id}", json={"skill_level": "GRANDMASTER"}, headers=headers)
    assert response.status_code == 422


def test_delete_nonexistent_sport_returns_404(client, auth_headers_for):
    response = client.delete(
        "/api/v1/profiles/me/sports/00000000-0000-0000-0000-000000000000",
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 404


def test_update_nonexistent_sport_returns_404(client, auth_headers_for):
    response = client.patch(
        "/api/v1/profiles/me/sports/00000000-0000-0000-0000-000000000000",
        json={"skill_level": "ADVANCED"},
        headers=auth_headers_for("PLAYER"),
    )
    assert response.status_code == 404


def test_sports_list_isolated_per_user(client, auth_headers_for):
    user_a = auth_headers_for("PLAYER")
    user_b = auth_headers_for("PLAYER")

    client.post("/api/v1/profiles/me/sports", json={"sport": "Golf", "skill_level": "BEGINNER"}, headers=user_a)

    response_b = client.get("/api/v1/profiles/me/sports", headers=user_b)
    assert all(s["sport"] != "Golf" for s in response_b.json())
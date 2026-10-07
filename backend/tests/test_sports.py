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

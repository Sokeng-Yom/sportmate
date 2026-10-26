import uuid


def test_me_returns_the_callers_profile(client, auth_headers_for, user_id_of):
    headers = auth_headers_for("PLAYER")
    me = client.get("/api/v1/profiles/me", headers=headers).json()
    assert me["id"] == user_id_of(headers) and me["role"] == "PLAYER" and me["restricted_until"] is None
    assert set(me) == {"id", "name", "role", "avatar", "restricted_until", "last_seen_at", "created_at"}


def test_profile_update_cannot_change_role_or_restrictions(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    response = client.patch(
        "/api/v1/profiles/me",
        json={"name": "Sok Dara", "role": "ADMIN", "restricted_until": None, "id": str(uuid.uuid4())},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Sok Dara" and response.json()["role"] == "PLAYER"
    assert client.get("/api/v1/admin/ping", headers=headers).status_code == 403


def test_profile_update_validation(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    for bad in ({"name": ""}, {"name": "   "}, {"name": "x" * 81}, {"avatar": "x" * 501}):
        assert client.patch("/api/v1/profiles/me", json=bad, headers=headers).status_code == 422, bad
    assert client.patch("/api/v1/profiles/me", json={}, headers=headers).status_code == 200


def test_null_name_means_leave_unchanged_not_a_server_error(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    response = client.patch("/api/v1/profiles/me", json={"name": None}, headers=headers)
    assert response.status_code == 200 and response.json()["name"] == "Test PLAYER"

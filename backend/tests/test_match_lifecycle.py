def create_test_match(client, headers, players_needed=2):
    response = client.post(
        "/api/v1/matches",
        json={"sport": "Badminton", "location": "Phnom Penh", "date": "2026-11-01", "time": "19:00:00", "players_needed": players_needed, "skill_level": "BEGINNER"},
        headers=headers,
    )
    return response.json()["id"]


def test_join_match_success(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    joiner = auth_headers_for("PLAYER")
    match_id = create_test_match(client, creator, players_needed=2)

    response = client.post(f"/api/v1/matches/{match_id}/join", headers=joiner)
    assert response.status_code == 200
    assert len(response.json()["players"]) == 1


def test_match_transitions_to_full_when_capacity_reached(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    p1 = auth_headers_for("PLAYER")
    p2 = auth_headers_for("PLAYER")
    match_id = create_test_match(client, creator, players_needed=2)

    client.post(f"/api/v1/matches/{match_id}/join", headers=p1)
    response = client.post(f"/api/v1/matches/{match_id}/join", headers=p2)

    assert response.status_code == 200
    assert response.json()["status"] == "FULL"


def test_cannot_join_full_match(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    p1 = auth_headers_for("PLAYER")
    p2 = auth_headers_for("PLAYER")
    p3 = auth_headers_for("PLAYER")
    match_id = create_test_match(client, creator, players_needed=2)

    client.post(f"/api/v1/matches/{match_id}/join", headers=p1)
    client.post(f"/api/v1/matches/{match_id}/join", headers=p2)
    response = client.post(f"/api/v1/matches/{match_id}/join", headers=p3)

    assert response.status_code == 400
    assert "full" in response.json()["detail"].lower()


def test_cannot_join_twice(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    joiner = auth_headers_for("PLAYER")
    match_id = create_test_match(client, creator, players_needed=3)

    client.post(f"/api/v1/matches/{match_id}/join", headers=joiner)
    response = client.post(f"/api/v1/matches/{match_id}/join", headers=joiner)
    assert response.status_code == 400


# def test_leave_reopens_full_match(client, auth_headers_for):
#     creator = auth_headers_for("PLAYER")
#     p1 = auth_headers_for("PLAYER")
#     match_id = create_test_match(client, creator, players_needed=1)

#     join_response = client.post(f"/api/v1/matches/{match_id}/join", headers=p1)
#     assert join_response.json()["status"] == "FULL"

#     leave_response = client.post(f"/api/v1/matches/{match_id}/leave", headers=p1)
#     assert leave_response.json()["status"] == "OPEN"

def test_leave_reopens_full_match(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    p1 = auth_headers_for("PLAYER")
    p2 = auth_headers_for("PLAYER")

    match_id = create_test_match(client, creator, players_needed=2)

    # Player 1 joins → still OPEN
    response = client.post(
        f"/api/v1/matches/{match_id}/join",
        headers=p1,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "OPEN"

    # Player 2 joins → FULL
    response = client.post(
        f"/api/v1/matches/{match_id}/join",
        headers=p2,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "FULL"

    # Player 1 leaves → OPEN
    response = client.post(
        f"/api/v1/matches/{match_id}/leave",
        headers=p1,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "OPEN"

def test_only_creator_can_cancel(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    other = auth_headers_for("PLAYER")
    match_id = create_test_match(client, creator)

    response = client.patch(f"/api/v1/matches/{match_id}/cancel", headers=other)
    assert response.status_code == 403

    response = client.patch(f"/api/v1/matches/{match_id}/cancel", headers=creator)
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"




def test_critical_leave_restricts_user(client, auth_headers_for, db_session):
    from datetime import datetime, timezone, timedelta
    from app.models.profile import Profile

    creator = auth_headers_for("PLAYER")
    joiner_headers = auth_headers_for("PLAYER")

    # Create a match starting in 1 hour -> leaving now is CRITICAL
    near_future = datetime.utcnow() + timedelta(hours=1)
    match_response = client.post(
        "/api/v1/matches",
        json={
            "sport": "Badminton", "location": "Phnom Penh",
            "date": near_future.date().isoformat(),
            "time": near_future.time().isoformat(),
            "players_needed": 2, "skill_level": "BEGINNER",
        },
        headers=creator,
    )
    match_id = match_response.json()["id"]

    client.post(f"/api/v1/matches/{match_id}/join", headers=joiner_headers)
    client.post(f"/api/v1/matches/{match_id}/leave", headers=joiner_headers)

    # Extract the joiner's user id from their token to check the profile
    import jwt as pyjwt
    token = joiner_headers["Authorization"].split(" ")[1]
    decoded = pyjwt.decode(token, options={"verify_signature": False})
    joiner_id = decoded["sub"]

    profile = db_session.query(Profile).filter(Profile.id == joiner_id).first()
    assert profile.restricted_until is not None
    assert profile.restricted_until > datetime.now(timezone.utc)


def test_restricted_user_cannot_join(client, auth_headers_for, db_session):
    from datetime import datetime, timezone, timedelta
    from app.models.profile import Profile

    restricted_headers = auth_headers_for("PLAYER")
    import jwt as pyjwt
    token = restricted_headers["Authorization"].split(" ")[1]
    decoded = pyjwt.decode(token, options={"verify_signature": False})
    user_id = decoded["sub"]

    profile = db_session.query(Profile).filter(Profile.id == user_id).first()
    profile.restricted_until = datetime.now(timezone.utc) + timedelta(days=3)
    db_session.commit()

    creator = auth_headers_for("PLAYER")
    match_id = create_test_match(client, creator, players_needed=2)

    response = client.post(f"/api/v1/matches/{match_id}/join", headers=restricted_headers)
    assert response.status_code == 403

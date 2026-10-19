from datetime import timedelta

from tests.conftest import make_token


def expired_headers():
    token = make_token(sub="00000000-0000-0000-0000-000000000000", exp_delta=timedelta(seconds=-10))
    return {"Authorization": f"Bearer {token}"}


def test_expired_token_rejected_on_matches_list(client):
    response = client.get("/api/v1/matches", headers=expired_headers())
    assert response.status_code == 401


def test_expired_token_rejected_on_match_create(client):
    response = client.post("/api/v1/matches", json={}, headers=expired_headers())
    assert response.status_code == 401


def test_expired_token_rejected_on_sports(client):
    response = client.get("/api/v1/profiles/me/sports", headers=expired_headers())
    assert response.status_code == 401


def test_expired_token_rejected_on_admin_ping(client):
    response = client.get("/api/v1/admin/ping", headers=expired_headers())
    assert response.status_code == 401


def test_expired_token_rejected_on_venues_ping(client):
    response = client.get("/api/v1/venues/ping", headers=expired_headers())
    assert response.status_code == 401


def test_expired_token_rejected_on_waiting_list(client):
    response = client.post(
        "/api/v1/matches/00000000-0000-0000-0000-000000000000/waiting-list",
        headers=expired_headers(),
    )
    assert response.status_code == 401


def test_no_token_rejected_consistently_across_endpoints(client):
    endpoints = [
        ("GET", "/api/v1/matches"),
        ("GET", "/api/v1/profiles/me"),
        ("GET", "/api/v1/profiles/me/sports"),
        ("GET", "/api/v1/admin/ping"),
        ("GET", "/api/v1/venues/ping"),
    ]
    for method, path in endpoints:
        response = client.request(method, path)
        assert response.status_code == 401, f"{method} {path} did not return 401 with no token"

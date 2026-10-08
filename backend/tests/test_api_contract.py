import re
from datetime import timedelta

from app.core.clock import utc_now_naive
from app.main import app

API_PREFIX = "/api/v1"
DUMMY_UUID = "00000000-0000-0000-0000-000000000000"

# Placeholder endpoints from Week 3 that return an untyped body.
# Replace or delete them when the real admin/venue endpoints arrive (Week 7).
UNTYPED_ALLOWLIST = {
    ("GET", "/api/v1/admin/ping"),
    ("GET", "/api/v1/venues/ping"),
}

MATCH_KEYS = {
    "id", "sport", "location", "date", "time", "players_needed",
    "skill_level", "status", "created_by", "created_at",
}
PAGE_KEYS = {"items", "total", "page", "page_size"}


def _operations():
    spec = app.openapi()
    for path, methods in spec["paths"].items():
        if not path.startswith(API_PREFIX):
            continue
        for method, operation in methods.items():
            yield method.upper(), path, operation


def test_every_api_endpoint_rejects_requests_without_a_token(client):
    not_protected = []
    for method, path, _ in _operations():
        url = re.sub(r"\{[^}]+\}", DUMMY_UUID, path)
        response = client.request(method, url)
        if response.status_code != 401:
            not_protected.append(f"{method} {path} -> {response.status_code}")
    assert not not_protected, f"Endpoints that did not return 401 without a token: {not_protected}"


def test_every_json_response_has_a_declared_schema():
    untyped = []
    for method, path, operation in _operations():
        if (method, path) in UNTYPED_ALLOWLIST:
            continue
        for code in ("200", "201"):
            response = operation["responses"].get(code)
            if response is None:
                continue
            schema = response.get("content", {}).get("application/json", {}).get("schema")
            if not schema:
                untyped.append(f"{method} {path} -> {code}")
    assert not untyped, f"Responses without a schema (frontend types would be 'unknown'): {untyped}"


def test_recommended_is_not_shadowed_by_the_match_id_route(client, auth_headers_for):
    response = client.get("/api/v1/matches/recommended", headers=auth_headers_for("PLAYER"))
    assert response.status_code == 200
    assert set(response.json()) == PAGE_KEYS


def test_match_response_shapes_are_stable(client, auth_headers_for):
    headers = auth_headers_for("PLAYER")
    start = utc_now_naive() + timedelta(days=30)
    created = client.post(
        "/api/v1/matches",
        json={
            "sport": "Badminton",
            "location": "Phnom Penh",
            "date": start.date().isoformat(),
            "time": "19:00:00",
            "players_needed": 4,
            "skill_level": "BEGINNER",
        },
        headers=headers,
    )
    assert created.status_code == 201
    assert set(created.json()) == MATCH_KEYS

    detail = client.get(f"/api/v1/matches/{created.json()['id']}", headers=headers)
    assert set(detail.json()) == MATCH_KEYS | {"players"}

    listing = client.get("/api/v1/matches", headers=headers).json()
    assert set(listing) == PAGE_KEYS
    assert set(listing["items"][0]) == MATCH_KEYS

    recommended = client.get("/api/v1/matches/recommended", headers=headers).json()
    for item in recommended["items"]:
        assert set(item) == MATCH_KEYS | {"score"}

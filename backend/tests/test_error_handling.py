from fastapi.testclient import TestClient

from app.db.session import get_db
from app.main import app


def test_validation_errors_use_one_readable_detail(client, auth_headers_for):
    response = client.post("/api/v1/matches", json={}, headers=auth_headers_for("PLAYER"))
    body = response.json()
    assert response.status_code == 422 and set(body) == {"detail"} and isinstance(body["detail"], str)


def test_unknown_routes_and_methods_use_the_same_shape(client):
    missing = client.get("/api/v1/nope")
    assert missing.status_code == 404 and set(missing.json()) == {"detail"}
    wrong_method = client.delete("/health")
    assert wrong_method.status_code == 405 and set(wrong_method.json()) == {"detail"}


def test_unexpected_errors_return_a_generic_500_without_internals():
    def broken_db():
        raise RuntimeError("boom: secret internals")
        yield  # makes this a generator dependency like the real get_db

    app.dependency_overrides[get_db] = broken_db
    try:
        response = TestClient(app, raise_server_exceptions=False).get("/health/db")
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert "boom" not in response.text

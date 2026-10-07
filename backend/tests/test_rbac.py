def test_admin_ping_allows_admin(client, auth_headers_for):
    response = client.get("/api/v1/admin/ping", headers=auth_headers_for("ADMIN"))
    assert response.status_code == 200


def test_admin_ping_blocks_player(client, auth_headers_for):
    response = client.get("/api/v1/admin/ping", headers=auth_headers_for("PLAYER"))
    assert response.status_code == 403


def test_admin_ping_blocks_venue_owner(client, auth_headers_for):
    response = client.get("/api/v1/admin/ping", headers=auth_headers_for("VENUE_OWNER"))
    assert response.status_code == 403


def test_venues_ping_allows_venue_owner(client, auth_headers_for):
    response = client.get("/api/v1/venues/ping", headers=auth_headers_for("VENUE_OWNER"))
    assert response.status_code == 200


def test_venues_ping_blocks_player(client, auth_headers_for):
    response = client.get("/api/v1/venues/ping", headers=auth_headers_for("PLAYER"))
    assert response.status_code == 403


def test_venues_ping_blocks_admin(client, auth_headers_for):
    response = client.get("/api/v1/venues/ping", headers=auth_headers_for("ADMIN"))
    assert response.status_code == 403
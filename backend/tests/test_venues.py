import uuid

from app.models.system import Notification, SecurityLog


def _create(client, headers, name=None):
    name = name or f"Hall {uuid.uuid4().hex[:8]}"
    response = client.post(
        "/api/v1/venues", json={"name": name, "address": "123 Main St, Phnom Penh"}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


def _submit(client, headers, name=None):
    venue = _create(client, headers, name)
    assert client.post(f"/api/v1/venues/{venue['id']}/confirm-payment", headers=headers).status_code == 200
    return venue


def test_owner_registers_a_venue_in_payment_pending(client, auth_headers_for, user_id_of):
    owner = auth_headers_for("VENUE_OWNER")
    venue = _create(client, owner)
    assert venue["status"] == "PAYMENT_PENDING"
    assert venue["owner_id"] == user_id_of(owner)


def test_players_and_admins_cannot_register_venues(client, auth_headers_for):
    for role in ("PLAYER", "ADMIN"):
        response = client.post(
            "/api/v1/venues", json={"name": "X", "address": "Y"}, headers=auth_headers_for(role)
        )
        assert response.status_code == 403


def test_invalid_venue_payload_is_rejected(client, auth_headers_for):
    owner = auth_headers_for("VENUE_OWNER")
    assert client.post("/api/v1/venues", json={"name": "  ", "address": "x"}, headers=owner).status_code == 422
    assert client.post("/api/v1/venues", json={"address": "x"}, headers=owner).status_code == 422


def test_payment_confirmation_moves_the_venue_to_pending_review(client, auth_headers_for):
    owner = auth_headers_for("VENUE_OWNER")
    venue = _create(client, owner)
    response = client.post(f"/api/v1/venues/{venue['id']}/confirm-payment", headers=owner)
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING_REVIEW"
    again = client.post(f"/api/v1/venues/{venue['id']}/confirm-payment", headers=owner)
    assert again.status_code == 400


def test_only_the_owner_can_confirm_payment_or_edit(client, auth_headers_for):
    owner, other = auth_headers_for("VENUE_OWNER"), auth_headers_for("VENUE_OWNER")
    venue = _create(client, owner)
    assert client.post(f"/api/v1/venues/{venue['id']}/confirm-payment", headers=other).status_code == 403
    assert client.patch(f"/api/v1/venues/{venue['id']}", json={"name": "Hacked"}, headers=other).status_code == 403


def test_owner_can_update_venue_information(client, auth_headers_for):
    owner = auth_headers_for("VENUE_OWNER")
    venue = _create(client, owner)
    response = client.patch(
        f"/api/v1/venues/{venue['id']}",
        json={"description": "Six courts, air-conditioned", "name": None},
        headers=owner,
    )
    assert response.status_code == 200
    assert response.json()["description"] == "Six courts, air-conditioned"
    assert response.json()["name"] == venue["name"]  # null does not clear a required field


def test_full_approval_flow_notifies_the_owner_and_writes_an_audit_log(
    client, auth_headers_for, db_session, user_id_of
):
    owner, admin = auth_headers_for("VENUE_OWNER"), auth_headers_for("ADMIN")
    venue = _submit(client, owner)

    pending = client.get("/api/v1/admin/venues?status=PENDING_REVIEW", headers=admin).json()
    assert venue["id"] in [v["id"] for v in pending["items"]]

    approved = client.post(f"/api/v1/admin/venues/{venue['id']}/approve", headers=admin)
    assert approved.status_code == 200
    assert approved.json()["status"] == "APPROVED"
    assert approved.json()["reviewed_at"] is not None

    mine = client.get("/api/v1/venues/mine", headers=owner).json()
    assert [v["status"] for v in mine if v["id"] == venue["id"]] == ["APPROVED"]

    db_session.expire_all()
    note = (
        db_session.query(Notification)
        .filter(Notification.user_id == user_id_of(owner), Notification.type == "VENUE_APPROVED")
        .first()
    )
    assert note is not None
    log = (
        db_session.query(SecurityLog)
        .filter(SecurityLog.action == "VENUE_APPROVED", SecurityLog.details == f"venue_id={venue['id']}")
        .first()
    )
    assert log is not None


def test_rejection_gives_the_owner_a_clear_rejected_state(client, auth_headers_for):
    owner, admin = auth_headers_for("VENUE_OWNER"), auth_headers_for("ADMIN")
    venue = _submit(client, owner)

    assert client.post(f"/api/v1/admin/venues/{venue['id']}/reject", json={}, headers=admin).status_code == 422
    rejected = client.post(
        f"/api/v1/admin/venues/{venue['id']}/reject", json={"reason": "Address cannot be verified"}, headers=admin
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "REJECTED"

    mine = client.get(f"/api/v1/venues/{venue['id']}", headers=owner).json()
    assert mine["status"] == "REJECTED"
    assert mine["rejection_reason"] == "Address cannot be verified"
    assert client.patch(f"/api/v1/venues/{venue['id']}", json={"name": "Retry"}, headers=owner).status_code == 400
    assert client.post(f"/api/v1/admin/venues/{venue['id']}/approve", headers=admin).status_code == 400


def test_only_venues_in_review_can_be_approved(client, auth_headers_for):
    owner, admin = auth_headers_for("VENUE_OWNER"), auth_headers_for("ADMIN")
    venue = _create(client, owner)  # still PAYMENT_PENDING
    assert client.post(f"/api/v1/admin/venues/{venue['id']}/approve", headers=admin).status_code == 400


def test_admin_endpoints_are_admin_only(client, auth_headers_for):
    owner = auth_headers_for("VENUE_OWNER")
    venue = _submit(client, owner)
    for headers in (owner, auth_headers_for("PLAYER")):
        assert client.get("/api/v1/admin/venues", headers=headers).status_code == 403
        assert client.post(f"/api/v1/admin/venues/{venue['id']}/approve", headers=headers).status_code == 403


def test_admin_status_filter_is_validated(client, auth_headers_for):
    response = client.get("/api/v1/admin/venues?status=BOGUS", headers=auth_headers_for("ADMIN"))
    assert response.status_code == 422


def test_players_only_see_approved_venues(client, auth_headers_for, make_approved_venue):
    token = uuid.uuid4().hex[:8]
    owner, approved = make_approved_venue(name=f"Approved {token}")
    _create(client, owner, name=f"Pending {token}")
    player = auth_headers_for("PLAYER")

    listing = client.get(f"/api/v1/venues?q={token}", headers=player).json()
    assert [v["name"] for v in listing["items"]] == [f"Approved {token}"]

    pending = [v for v in client.get("/api/v1/venues/mine", headers=owner).json() if v["status"] != "APPROVED"][0]
    assert client.get(f"/api/v1/venues/{pending['id']}", headers=player).status_code == 404
    assert client.get(f"/api/v1/venues/{approved['id']}", headers=player).status_code == 200


def test_search_text_is_not_treated_as_a_wildcard(client, auth_headers_for, make_approved_venue):
    make_approved_venue(name=f"Plain {uuid.uuid4().hex[:6]}")
    response = client.get("/api/v1/venues?q=%25", headers=auth_headers_for("PLAYER")).json()
    assert response["total"] == 0  # "%" is searched literally, not as "match everything"

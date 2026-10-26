import uuid

from app.models.system import SecurityLog


def _submit_venue(client, owner):
    venue = client.post("/api/v1/venues", json={"name": f"Hall {uuid.uuid4().hex[:6]}", "address": "St 9"}, headers=owner).json()
    client.post(f"/api/v1/venues/{venue['id']}/confirm-payment", headers=owner)
    return venue["id"]


def test_admin_journey_applications_moderation_and_audit_trail(client, auth_headers_for, db_session, user_id_of):
    admin = auth_headers_for("ADMIN")
    owner_a, owner_b = auth_headers_for("VENUE_OWNER"), auth_headers_for("VENUE_OWNER")
    author, r1, r2 = (auth_headers_for("PLAYER") for _ in range(3))

    # venue applications: oldest first, one approved, one rejected, no second decision
    first, second = _submit_venue(client, owner_a), _submit_venue(client, owner_b)
    queue = [v["id"] for v in client.get("/api/v1/admin/venues?status=PENDING_REVIEW&page_size=100", headers=admin).json()["items"]]
    assert queue.index(first) < queue.index(second)
    assert client.post(f"/api/v1/admin/venues/{first}/approve", headers=admin).status_code == 200
    assert client.post(f"/api/v1/admin/venues/{second}/reject", json={"reason": "Incomplete documents"}, headers=admin).status_code == 200
    assert client.post(f"/api/v1/admin/venues/{first}/reject", json={"reason": "late"}, headers=admin).status_code == 400
    approved = [v["id"] for v in client.get("/api/v1/admin/venues?status=APPROVED&page_size=100", headers=admin).json()["items"]]
    assert first in approved and second not in approved

    # reported content: most reported first; dismiss one, remove the other
    spam = client.post("/api/v1/posts", json={"content": "buy cheap stuff"}, headers=author).json()["id"]
    harmless = client.post("/api/v1/posts", json={"content": "nice weather"}, headers=author).json()["id"]
    for reporter in (r1, r2):
        assert client.post(f"/api/v1/posts/{spam}/report", json={"reason": "spam"}, headers=reporter).status_code == 201
    assert client.post(f"/api/v1/posts/{harmless}/report", json={"reason": "annoying"}, headers=r1).status_code == 201

    reported = client.get("/api/v1/admin/posts/reported?page_size=100", headers=admin).json()["items"]
    ids = [p["id"] for p in reported]
    assert ids.index(spam) < ids.index(harmless)
    assert [p["report_count"] for p in reported if p["id"] == spam] == [2]

    assert client.post(f"/api/v1/admin/posts/{harmless}/dismiss-reports", headers=admin).json() == {"dismissed": 1}
    assert client.get(f"/api/v1/posts/{harmless}", headers=author).status_code == 200
    assert client.delete(f"/api/v1/admin/posts/{spam}", headers=admin).status_code == 204
    assert client.get(f"/api/v1/posts/{spam}", headers=author).status_code == 404
    left = [p["id"] for p in client.get("/api/v1/admin/posts/reported?page_size=100", headers=admin).json()["items"]]
    assert spam not in left and harmless not in left

    # every moderation action left an audit row
    db_session.expire_all()
    actions = {row.action for row in db_session.query(SecurityLog).filter(SecurityLog.user_id == uuid.UUID(user_id_of(admin))).all()}
    assert {"VENUE_APPROVED", "VENUE_REJECTED", "REPORTS_DISMISSED", "POST_REMOVED_BY_ADMIN"} <= actions

import uuid

from app.models.system import SecurityLog


def _post(client, headers, text=None):
    response = client.post("/api/v1/posts", json={"content": text or f"post {uuid.uuid4().hex[:8]}"}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_read_a_post(client, auth_headers_for, user_id_of):
    author, other = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    post = _post(client, author, "  Anyone up for badminton?  ")
    assert post["content"] == "Anyone up for badminton?"
    assert post["author_id"] == user_id_of(author) and post["author_name"] == "Test PLAYER"
    assert (post["like_count"], post["comment_count"], post["liked_by_me"]) == (0, 0, False)
    assert client.get(f"/api/v1/posts/{post['id']}", headers=other).json()["id"] == post["id"]
    assert post["id"] in [p["id"] for p in client.get("/api/v1/posts?page_size=100", headers=other).json()["items"]]


def test_post_validation(client, auth_headers_for):
    author = auth_headers_for("PLAYER")
    for bad in ("", "   ", "x" * 2001):
        assert client.post("/api/v1/posts", json={"content": bad}, headers=author).status_code == 422
    assert client.post("/api/v1/posts", json={}, headers=author).status_code == 422


def test_feed_is_newest_first_and_paginated(client, auth_headers_for):
    author = auth_headers_for("PLAYER")
    posts = [_post(client, author, f"p{i}") for i in range(3)]
    first = client.get("/api/v1/posts?mine=true&page_size=2", headers=author).json()
    assert [p["id"] for p in first["items"]] == [posts[2]["id"], posts[1]["id"]]
    assert first["total"] == 3
    second = client.get("/api/v1/posts?mine=true&page_size=2&page=2", headers=author).json()
    assert [p["id"] for p in second["items"]] == [posts[0]["id"]]


def test_likes_are_idempotent_and_reversible(client, auth_headers_for):
    author, fan = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    post = _post(client, author)
    url = f"/api/v1/posts/{post['id']}/like"

    assert client.post(url, headers=fan).json() == {"liked": True, "like_count": 1}
    assert client.post(url, headers=fan).json() == {"liked": True, "like_count": 1}  # repeat is harmless
    assert client.post(url, headers=author).json()["like_count"] == 2

    as_fan = client.get(f"/api/v1/posts/{post['id']}", headers=fan).json()
    assert (as_fan["like_count"], as_fan["liked_by_me"]) == (2, True)
    assert client.get(f"/api/v1/posts/{post['id']}", headers=auth_headers_for("PLAYER")).json()["liked_by_me"] is False

    assert client.delete(url, headers=fan).json() == {"liked": False, "like_count": 1}
    assert client.delete(url, headers=fan).json() == {"liked": False, "like_count": 1}


def test_comments(client, auth_headers_for):
    author, commenter = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    post = _post(client, author)
    url = f"/api/v1/posts/{post['id']}/comments"

    for bad in ("", "  ", "x" * 501):
        assert client.post(url, json={"content": bad}, headers=commenter).status_code == 422
    first = client.post(url, json={"content": "I'm in"}, headers=commenter)
    assert first.status_code == 201 and first.json()["author_name"] == "Test PLAYER"
    client.post(url, json={"content": "Me too"}, headers=author)

    listing = client.get(url, headers=commenter).json()
    assert [c["content"] for c in listing["items"]] == ["I'm in", "Me too"]  # oldest first
    assert client.get(f"/api/v1/posts/{post['id']}", headers=author).json()["comment_count"] == 2


def test_delete_rules_and_cascade(client, auth_headers_for, db_session):
    author, other, admin = auth_headers_for("PLAYER"), auth_headers_for("PLAYER"), auth_headers_for("ADMIN")
    post = _post(client, author)
    comment = client.post(f"/api/v1/posts/{post['id']}/comments", json={"content": "hi"}, headers=other).json()

    assert client.delete(f"/api/v1/posts/{post['id']}", headers=other).status_code == 403
    assert client.delete(f"/api/v1/posts/{post['id']}/comments/{comment['id']}", headers=author).status_code == 403
    assert client.delete(f"/api/v1/posts/{post['id']}/comments/{comment['id']}", headers=other).status_code == 204

    assert client.delete(f"/api/v1/posts/{post['id']}", headers=author).status_code == 204
    assert client.get(f"/api/v1/posts/{post['id']}", headers=author).status_code == 404
    assert client.delete(f"/api/v1/posts/{post['id']}", headers=author).status_code == 404

    admin_target = _post(client, author)
    assert client.delete(f"/api/v1/posts/{admin_target['id']}", headers=admin).status_code == 204
    db_session.expire_all()
    assert db_session.query(SecurityLog).filter(
        SecurityLog.action == "POST_REMOVED_BY_ADMIN", SecurityLog.details.like(f"post_id={admin_target['id']}%")
    ).count() == 1


def test_reporting_and_the_moderation_queue(client, auth_headers_for):
    author, r1, r2, admin = (auth_headers_for(role) for role in ("PLAYER", "PLAYER", "PLAYER", "ADMIN"))
    post = _post(client, author, "buy cheap stuff now")
    url = f"/api/v1/posts/{post['id']}/report"

    assert client.post(url, json={"reason": "spam"}, headers=author).status_code == 400  # own post
    assert client.post(url, json={}, headers=r1).status_code == 422
    assert client.post(url, json={"reason": "spam"}, headers=r1).status_code == 201
    assert client.post(url, json={"reason": "spam again"}, headers=r1).status_code == 400  # one report each
    assert client.post(url, json={"reason": "scam"}, headers=r2).status_code == 201

    queue = client.get("/api/v1/admin/posts/reported?page_size=100", headers=admin).json()
    entry = [p for p in queue["items"] if p["id"] == post["id"]][0]
    assert entry["report_count"] == 2 and sorted(entry["reasons"]) == ["scam", "spam"]

    assert client.get("/api/v1/admin/posts/reported", headers=author).status_code == 403
    assert client.delete(f"/api/v1/admin/posts/{post['id']}", headers=author).status_code == 403

    dismissed = client.post(f"/api/v1/admin/posts/{post['id']}/dismiss-reports", headers=admin)
    assert dismissed.json() == {"dismissed": 2}
    queue = client.get("/api/v1/admin/posts/reported?page_size=100", headers=admin).json()
    assert post["id"] not in [p["id"] for p in queue["items"]]


def test_admin_removes_a_reported_post(client, auth_headers_for):
    author, reporter, admin = auth_headers_for("PLAYER"), auth_headers_for("PLAYER"), auth_headers_for("ADMIN")
    post = _post(client, author)
    client.post(f"/api/v1/posts/{post['id']}/report", json={"reason": "abuse"}, headers=reporter)

    assert client.delete(f"/api/v1/admin/posts/{post['id']}", headers=admin).status_code == 204
    assert client.get(f"/api/v1/posts/{post['id']}", headers=reporter).status_code == 404
    queue = client.get("/api/v1/admin/posts/reported?page_size=100", headers=admin).json()
    assert post["id"] not in [p["id"] for p in queue["items"]]


def test_unknown_post_is_404(client, auth_headers_for):
    player = auth_headers_for("PLAYER")
    missing = uuid.uuid4()
    for method, url in (("get", f"/api/v1/posts/{missing}"), ("post", f"/api/v1/posts/{missing}/like"),
                        ("get", f"/api/v1/posts/{missing}/comments"), ("delete", f"/api/v1/posts/{missing}")):
        assert getattr(client, method)(url, headers=player).status_code == 404


def test_posting_too_fast_is_rate_limited(client, auth_headers_for, monkeypatch):
    monkeypatch.setattr("app.api.v1.posts.POST_RATE_LIMIT", 2)
    author = auth_headers_for("PLAYER")
    assert [client.post("/api/v1/posts", json={"content": "x"}, headers=author).status_code for _ in range(2)] == [201, 201]
    assert client.post("/api/v1/posts", json={"content": "x"}, headers=author).status_code == 429

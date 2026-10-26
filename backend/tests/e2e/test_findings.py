"""
Tests for BUG-001..003 found while scripting the journeys.
They FAIL until the Day 40 fixes are in, then they protect against regressions.
"""
from datetime import timedelta

from sqlalchemy import text

from app.core.clock import utc_now
from app.models.match import Match
from app.models.profile import Profile
from app.models.waiting_list import WaitingList
from tests.e2e.helpers import insert_match, notification_types


def _restrict(db, user_id, days=3):
    profile = db.query(Profile).filter(Profile.id == user_id).one()
    profile.restricted_until = utc_now() + timedelta(days=days)
    db.commit()


# ---- BUG-002: the restriction can be bypassed through the waiting list -----------------------------

def test_restricted_player_cannot_join_the_waiting_list(client, auth_headers_for, new_match, db_session, user_id_of):
    host, filler, flaky = (auth_headers_for("PLAYER") for _ in range(3))
    match_id, _ = new_match(host, players_needed=1)
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=filler).status_code == 200
    _restrict(db_session, user_id_of(flaky))
    assert client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=flaky).status_code == 403


def test_restricted_players_are_skipped_when_a_freed_slot_is_offered(client, auth_headers_for, new_match, db_session, user_id_of):
    host, filler, flaky, honest = (auth_headers_for("PLAYER") for _ in range(4))
    match_id, _ = new_match(host, players_needed=1)
    client.post(f"/api/v1/matches/{match_id}/join", headers=filler)
    flaky_entry = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=flaky).json()
    honest_entry = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=honest).json()
    _restrict(db_session, user_id_of(flaky))  # restricted while already queued

    assert client.post(f"/api/v1/matches/{match_id}/leave", headers=filler).status_code == 200

    db_session.expire_all()
    status = lambda entry: db_session.query(WaitingList).filter(WaitingList.id == entry["id"]).one().status
    assert (status(honest_entry), status(flaky_entry)) == ("NOTIFIED", "WAITING")
    assert "WAITING_LIST_OFFER" in notification_types(client, honest)


# ---- BUG-003: started matches and the missing COMPLETED state --------------------------------------

def test_a_match_that_already_started_cannot_be_joined(client, auth_headers_for, seeded_profile, db_session):
    host = seeded_profile("PLAYER")
    late = auth_headers_for("PLAYER")
    match = insert_match(db_session, host.id, hours_from_now=-1)
    response = client.post(f"/api/v1/matches/{match.id}/join", headers=late)
    assert response.status_code == 400 and "started" in response.json()["detail"]


def test_finished_matches_are_closed_by_the_lifecycle_job(db_session, seeded_profile):
    from app.services.match_lifecycle import close_finished_matches

    creator, waiter = seeded_profile("PLAYER"), seeded_profile("PLAYER")
    confirmed_old = insert_match(db_session, creator.id, hours_from_now=-5, status="CONFIRMED")
    full_old = insert_match(db_session, creator.id, hours_from_now=-5, status="FULL")
    open_old = insert_match(db_session, creator.id, hours_from_now=-5, status="OPEN")
    just_started = insert_match(db_session, creator.id, hours_from_now=-1, status="CONFIRMED")  # still being played
    upcoming = insert_match(db_session, creator.id, hours_from_now=24, status="OPEN")
    db_session.add(WaitingList(match_id=open_old.id, user_id=waiter.id, position=1, status="WAITING"))
    db_session.commit()

    assert close_finished_matches(db_session) >= 3

    db_session.expire_all()
    status = lambda m: db_session.query(Match).filter(Match.id == m.id).one().status
    assert [status(m) for m in (confirmed_old, full_old, open_old, just_started, upcoming)] == [
        "COMPLETED", "COMPLETED", "CANCELLED", "CONFIRMED", "OPEN",
    ]
    entry = db_session.query(WaitingList).filter(WaitingList.match_id == open_old.id).one()
    assert entry.status == "EXPIRED"  # nobody keeps waiting for a match that is over


# ---- BUG-001: admin console (users, restrictions, audit trail) ------------------------------------

def _email_of(db, user_id):
    return db.execute(text("select email from auth.users where id = cast(:i as uuid)"), {"i": user_id}).scalar()


def test_admin_can_search_and_filter_users(client, auth_headers_for, db_session, user_id_of):
    admin, player, owner = auth_headers_for("ADMIN"), auth_headers_for("PLAYER"), auth_headers_for("VENUE_OWNER")
    email = _email_of(db_session, user_id_of(player))

    found = client.get(f"/api/v1/admin/users?q={email}", headers=admin).json()
    assert found["total"] == 1
    user = found["items"][0]
    assert (user["id"], user["email"], user["role"], user["restricted"]) == (user_id_of(player), email, "PLAYER", False)

    owner_email = _email_of(db_session, user_id_of(owner))
    assert client.get(f"/api/v1/admin/users?q={owner_email}&role=PLAYER", headers=admin).json()["total"] == 0
    assert client.get(f"/api/v1/admin/users?q={owner_email}&role=VENUE_OWNER", headers=admin).json()["total"] == 1
    assert client.get("/api/v1/admin/users?q=%25", headers=admin).json()["total"] == 0  # "%" is plain text
    assert client.get("/api/v1/admin/users?role=BOSS", headers=admin).status_code == 422
    assert client.get("/api/v1/admin/users", headers=player).status_code == 403


def test_admin_can_restrict_and_unrestrict_a_player(client, auth_headers_for, new_match, user_id_of):
    admin, player, host, other_admin = (auth_headers_for(r) for r in ("ADMIN", "PLAYER", "PLAYER", "ADMIN"))
    uid = user_id_of(player)
    restrict = f"/api/v1/admin/users/{uid}/restrict"

    for bad in ({}, {"days": 0, "reason": "x"}, {"days": 366, "reason": "x"}, {"days": 3, "reason": "  "}):
        assert client.post(restrict, json=bad, headers=admin).status_code == 422, bad
    assert client.post(restrict, json={"days": 7, "reason": "Repeated no-shows"}, headers=player).status_code == 403
    assert client.post(f"/api/v1/admin/users/{user_id_of(other_admin)}/restrict", json={"days": 1, "reason": "x"}, headers=admin).status_code == 400
    assert client.post("/api/v1/admin/users/00000000-0000-0000-0000-000000000000/restrict", json={"days": 1, "reason": "x"}, headers=admin).status_code == 404

    done = client.post(restrict, json={"days": 7, "reason": "Repeated no-shows"}, headers=admin)
    assert done.status_code == 200 and done.json()["restricted"] is True and done.json()["restricted_until"]
    match_id, _ = new_match(host, players_needed=2)
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=player).status_code == 403
    assert client.get("/api/v1/profiles/me", headers=player).json()["restricted_until"] is not None
    assert "ACCOUNT_RESTRICTED" in notification_types(client, player)

    lifted = client.post(f"/api/v1/admin/users/{uid}/unrestrict", headers=admin)
    assert lifted.status_code == 200 and lifted.json()["restricted"] is False
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=player).status_code == 200

    logs = client.get("/api/v1/admin/security-logs?action=USER_RESTRICTED&page_size=100", headers=admin).json()
    assert any(uid in (entry["details"] or "") for entry in logs["items"])


def test_admin_can_read_the_audit_trail(client, auth_headers_for, new_match, user_id_of):
    admin, host, outsider = auth_headers_for("ADMIN"), auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    match_id, _ = new_match(host, players_needed=2)
    assert client.get(f"/api/v1/matches/{match_id}/messages", headers=outsider).status_code == 403  # suspicious: logged

    logs = client.get(f"/api/v1/admin/security-logs?user_id={user_id_of(outsider)}", headers=admin).json()
    assert logs["total"] >= 1
    newest = logs["items"][0]
    assert newest["action"] == "CHAT_ACCESS_DENIED" and match_id in newest["details"] and newest["user_name"] == "Test PLAYER"
    created = [entry["created_at"] for entry in logs["items"]]
    assert created == sorted(created, reverse=True)  # newest first

    assert len(client.get("/api/v1/admin/security-logs?page_size=1", headers=admin).json()["items"]) == 1
    assert client.get("/api/v1/admin/security-logs?user_id=not-a-uuid", headers=admin).status_code == 422
    assert client.get("/api/v1/admin/security-logs", headers=host).status_code == 403

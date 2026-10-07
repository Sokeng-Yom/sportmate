from datetime import datetime, timedelta

from app.db.session import SessionLocal
from app.models.waiting_list import WaitingList
from app.services.waiting_list_expiry import expire_stale_waiting_list_entries


def create_full_match(client, creator_headers, players_needed=1):
    response = client.post(
        "/api/v1/matches",
        json={"sport": "Badminton", "location": "Phnom Penh", "date": "2026-12-01", "time": "19:00:00", "players_needed": players_needed, "skill_level": "BEGINNER"},
        headers=creator_headers,
    )
    return response.json()["id"]


def test_cannot_join_waiting_list_for_open_match(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    match_id = create_full_match(client, creator, players_needed=2)

    response = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=auth_headers_for("PLAYER"))
    assert response.status_code == 400


def test_join_waiting_list_when_full(client, auth_headers_for):
    creator = auth_headers_for("PLAYER")
    filler = auth_headers_for("PLAYER")
    waiter = auth_headers_for("PLAYER")
    match_id = create_full_match(client, creator, players_needed=1)

    join_response = client.post(f"/api/v1/matches/{match_id}/join", headers=filler)
    assert join_response.json()["status"] == "FULL"  # sanity check the setup itself

    response = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=waiter)
    assert response.status_code == 201
    assert response.json()["status"] == "WAITING"


def test_leave_notifies_waiting_list(client, auth_headers_for, db_session):
    creator = auth_headers_for("PLAYER")
    filler = auth_headers_for("PLAYER")
    waiter = auth_headers_for("PLAYER")
    match_id = create_full_match(client, creator, players_needed=1)

    join_response = client.post(f"/api/v1/matches/{match_id}/join", headers=filler)
    assert join_response.json()["status"] == "FULL"

    waitlist_response = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=waiter)
    assert waitlist_response.status_code == 201

    client.post(f"/api/v1/matches/{match_id}/leave", headers=filler)

    entry = db_session.query(WaitingList).filter(WaitingList.match_id == match_id).first()
    assert entry is not None
    assert entry.status == "NOTIFIED"
    assert entry.expires_at is not None


def test_expiry_promotes_next_entry(db_session, seeded_profile):
    import uuid
    from datetime import date, time
    from app.models.match import Match

    creator = seeded_profile("PLAYER")
    user_1 = seeded_profile("PLAYER")
    user_2 = seeded_profile("PLAYER")

    match = Match(
        id=uuid.uuid4(),
        sport="Badminton",
        location="Phnom Penh",
        date=date(2026, 12, 1),
        time=time(19, 0),
        players_needed=1,
        skill_level="BEGINNER",
        status="FULL",
        created_by=creator.id,
    )
    db_session.add(match)
    db_session.commit()

    entry_1 = WaitingList(
        id=uuid.uuid4(), match_id=match.id, user_id=user_1.id,
        position=1, status="NOTIFIED",
        notified_at=datetime.utcnow() - timedelta(minutes=31),
        expires_at=datetime.utcnow() - timedelta(minutes=1),  # already expired
    )
    entry_2 = WaitingList(
        id=uuid.uuid4(), match_id=match.id, user_id=user_2.id,
        position=2, status="WAITING",
    )
    db_session.add_all([entry_1, entry_2])
    db_session.commit()

    expired_count = expire_stale_waiting_list_entries(db_session)

    db_session.refresh(entry_1)
    db_session.refresh(entry_2)

    # Don't assert an exact global count — other stale rows may exist in the
    # shared dev database from earlier test runs (tracked in the Week 8 TODO
    # to isolate tests against sportmate-test). Instead, assert this specific
    # test's two entries ended up in the correct state.
    assert expired_count >= 1
    assert entry_1.status == "EXPIRED"
    assert entry_2.status == "NOTIFIED"

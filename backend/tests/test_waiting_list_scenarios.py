import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import time, timedelta

from jose import jwt

from app.core.clock import local_now_naive, utc_now, utc_now_naive
from app.db.session import SessionLocal
from app.models.match import Match
from app.models.profile import Profile
from app.models.waiting_list import WaitingList
from app.services.waiting_list_expiry import expire_stale_waiting_list_entries


def _create_match(client, headers, players_needed, starts_at=None):
    starts_at = starts_at or (utc_now_naive() + timedelta(days=30)).replace(
        hour=19, minute=0, second=0, microsecond=0
    )
    response = client.post(
        "/api/v1/matches",
        json={
            "sport": "Badminton",
            "location": "Phnom Penh",
            "date": starts_at.date().isoformat(),
            "time": starts_at.time().isoformat(),
            "players_needed": players_needed,
            "skill_level": "BEGINNER",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _user_id(headers):
    return jwt.get_unverified_claims(headers["Authorization"].split(" ")[1])["sub"]


def _entry(db_session, entry_id):
    db_session.expire_all()
    return db_session.query(WaitingList).filter(WaitingList.id == entry_id).one()


def _statuses(db_session, entry_ids):
    return [_entry(db_session, entry_id).status for entry_id in entry_ids]


def test_freed_slots_are_offered_one_each_and_expiry_cascades(client, auth_headers_for, db_session):
    creator, p1, p2, w1, w2, w3 = (auth_headers_for("PLAYER") for _ in range(6))
    match_id = _create_match(client, creator, players_needed=2)
    for player in (p1, p2):
        assert client.post(f"/api/v1/matches/{match_id}/join", headers=player).status_code == 200

    entry_ids = []
    for waiter in (w1, w2, w3):
        response = client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=waiter)
        assert response.status_code == 201
        entry_ids.append(response.json()["id"])

    assert client.post(f"/api/v1/matches/{match_id}/leave", headers=p1).status_code == 200
    assert _statuses(db_session, entry_ids) == ["NOTIFIED", "WAITING", "WAITING"]

    assert client.post(f"/api/v1/matches/{match_id}/leave", headers=p2).status_code == 200
    assert _statuses(db_session, entry_ids) == ["NOTIFIED", "NOTIFIED", "WAITING"]

    # w1 ignores the offer; once it expires the slot goes to w3
    first = _entry(db_session, entry_ids[0])
    first.expires_at = utc_now_naive() - timedelta(minutes=1)
    db_session.commit()
    expire_stale_waiting_list_entries(db_session)
    assert _statuses(db_session, entry_ids) == ["EXPIRED", "NOTIFIED", "NOTIFIED"]


def test_critical_leave_restricts_leaver_and_promotes_first_waiter(client, auth_headers_for, db_session):
    creator, leaver, w1, w2 = (auth_headers_for("PLAYER") for _ in range(4))
    match_id = _create_match(client, creator, 1, starts_at=local_now_naive() + timedelta(hours=1))

    assert client.post(f"/api/v1/matches/{match_id}/join", headers=leaver).status_code == 200
    entry_ids = [
        client.post(f"/api/v1/matches/{match_id}/waiting-list", headers=waiter).json()["id"]
        for waiter in (w1, w2)
    ]

    assert client.post(f"/api/v1/matches/{match_id}/leave", headers=leaver).status_code == 200

    # 1. the leaver is restricted for about 3 days
    db_session.expire_all()
    profile = db_session.query(Profile).filter(Profile.id == _user_id(leaver)).one()
    remaining = profile.restricted_until - utc_now()
    assert timedelta(days=2, hours=23) < remaining <= timedelta(days=3)

    # 2. ...and cannot join anything else
    other_match = _create_match(client, creator, 2)
    assert client.post(f"/api/v1/matches/{other_match}/join", headers=leaver).status_code == 403

    # 3. the first waiter was notified, the second keeps waiting
    assert _statuses(db_session, entry_ids) == ["NOTIFIED", "WAITING"]

    # 4. the first waiter accepts and the match is full again
    assert client.post(f"/api/v1/waiting-list/{entry_ids[0]}/accept", headers=w1).status_code == 200
    detail = client.get(f"/api/v1/matches/{match_id}", headers=creator).json()
    assert [p["user_id"] for p in detail["players"]] == [_user_id(w1)]
    assert detail["status"] == "FULL"
    assert _entry(db_session, entry_ids[1]).status == "WAITING"


def test_restriction_lifts_when_the_window_ends(client, auth_headers_for, db_session):
    creator, player = (auth_headers_for("PLAYER") for _ in range(2))
    match_id = _create_match(client, creator, players_needed=2)

    profile = db_session.query(Profile).filter(Profile.id == _user_id(player)).one()
    profile.restricted_until = utc_now() + timedelta(days=3)
    db_session.commit()
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=player).status_code == 403

    profile.restricted_until = utc_now() - timedelta(seconds=1)
    db_session.commit()
    assert client.post(f"/api/v1/matches/{match_id}/join", headers=player).status_code == 200


def _add_match_with_queue(db_session, creator, first, second, status="FULL"):
    now = utc_now_naive()
    match = Match(
        id=uuid.uuid4(),
        sport="Badminton",
        location="Phnom Penh",
        date=now.date() + timedelta(days=30),
        time=time(19, 0),
        players_needed=1,
        skill_level="BEGINNER",
        status=status,
        created_by=creator.id,
    )
    expired_entry = WaitingList(
        id=uuid.uuid4(), match_id=match.id, user_id=first.id, position=1, status="NOTIFIED",
        notified_at=now - timedelta(minutes=31), expires_at=now - timedelta(minutes=1),
    )
    waiting_entry = WaitingList(
        id=uuid.uuid4(), match_id=match.id, user_id=second.id, position=2, status="WAITING",
    )
    db_session.add_all([match, expired_entry, waiting_entry])
    return expired_entry.id, waiting_entry.id


def test_many_simultaneous_expirations_with_two_competing_workers(seeded_profile, db_session):
    creator, first, second = (seeded_profile("PLAYER") for _ in range(3))
    expired_ids, waiting_ids = [], []
    for _ in range(3):
        expired_id, waiting_id = _add_match_with_queue(db_session, creator, first, second)
        expired_ids.append(expired_id)
        waiting_ids.append(waiting_id)
    db_session.commit()

    def run_job(_):
        session = SessionLocal()
        try:
            return expire_stale_waiting_list_entries(session)
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(run_job, range(2)))

    assert set(_statuses(db_session, expired_ids)) == {"EXPIRED"}
    assert set(_statuses(db_session, waiting_ids)) == {"NOTIFIED"}


def test_expired_offer_on_a_cancelled_match_is_not_re_offered(seeded_profile, db_session):
    creator, first, second = (seeded_profile("PLAYER") for _ in range(3))
    expired_id, waiting_id = _add_match_with_queue(db_session, creator, first, second, status="CANCELLED")
    db_session.commit()

    expire_stale_waiting_list_entries(db_session)

    assert _entry(db_session, expired_id).status == "EXPIRED"
    assert _entry(db_session, waiting_id).status == "WAITING"

import uuid
from datetime import timedelta

from app.core.clock import local_now_naive
from app.models.match import Match


def notification_types(client, headers) -> list[str]:
    items = client.get("/api/v1/notifications?page_size=100", headers=headers).json()["items"]
    return [n["type"] for n in items]


def insert_match(db, creator_id, *, hours_from_now, status="OPEN", players_needed=4, sport="Badminton") -> Match:
    """Inserts a match directly (the API only creates future ones in normal use)."""
    start = local_now_naive() + timedelta(hours=hours_from_now)
    match = Match(
        id=uuid.uuid4(), sport=sport, location="Phnom Penh", date=start.date(),
        time=start.time().replace(microsecond=0), players_needed=players_needed,
        skill_level="BEGINNER", status=status, created_by=creator_id,
    )
    db.add(match)
    db.commit()
    return match

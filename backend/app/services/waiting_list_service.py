from datetime import timedelta
from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.clock import utc_now, utc_now_naive
from app.core.constants import NotificationType
from app.models.match import Match, MatchPlayer
from app.models.profile import Profile
from app.models.waiting_list import WaitingList
from app.services.notifications import create_notification

OFFER_WINDOW_MINUTES = 30
# A booked (CONFIRMED) match can still refill when someone leaves.
_OFFERABLE_STATUSES = ("OPEN", "FULL", "CONFIRMED")


def count_joined_excluding_host(db: Session, match_id: UUID) -> int:
    return (
        db.query(func.count(MatchPlayer.id))
        .join(Match, Match.id == MatchPlayer.match_id)
        .filter(MatchPlayer.match_id == match_id, MatchPlayer.user_id != Match.created_by)
        .scalar()
    )


def count_joined_for_matches(db: Session, match_ids: list[UUID]) -> dict[UUID, int]:
    if not match_ids:
        return {}
    rows = (
        db.query(MatchPlayer.match_id, func.count(MatchPlayer.id))
        .filter(MatchPlayer.match_id.in_(match_ids))
        .group_by(MatchPlayer.match_id)
        .all()
    )
    return {match_id: count for match_id, count in rows}


def count_joined_excluding_hosts_for_matches(db: Session, match_ids: list[UUID]) -> dict[UUID, int]:
    if not match_ids:
        return {}
    rows = (
        db.query(MatchPlayer.match_id, func.count(MatchPlayer.id))
        .join(Match, Match.id == MatchPlayer.match_id)
        .filter(
            MatchPlayer.match_id.in_(match_ids),
            MatchPlayer.user_id != Match.created_by,
        )
        .group_by(MatchPlayer.match_id)
        .all()
    )
    return {match_id: count for match_id, count in rows}


def count_active_offers(db: Session, match_id: UUID, exclude_user_id=None) -> int:
    """Offers that are still inside their 30-minute window."""
    query = db.query(func.count()).select_from(WaitingList).filter(
        WaitingList.match_id == match_id,
        WaitingList.status == "NOTIFIED",
        WaitingList.expires_at > utc_now_naive(),
    )
    if exclude_user_id is not None:
        query = query.filter(WaitingList.user_id != exclude_user_id)
    return query.scalar()


def open_slots(db: Session, match: Match, for_user_id=None) -> int:
    """Slots a given user could take right now (slots held for OTHER waiters don't count)."""
    return (
        match.players_needed
        - count_joined_excluding_host(db, match.id)
        - count_active_offers(db, match.id, exclude_user_id=for_user_id)
    )


def offer_open_slots(db: Session, match: Match) -> int:
    """
    Offers every free slot to the next WAITING entries in position order (skipping players who
    are currently restricted) and notifies them. The caller must hold the match row lock and must
    have flushed pending changes (autoflush is off). Returns how many offers were made.
    """
    if match.status not in _OFFERABLE_STATUSES:
        return 0

    slots = open_slots(db, match)
    now = utc_now_naive()
    now_aware = utc_now()
    offered = 0
    while slots > 0:
        next_entry = (
            db.query(WaitingList)
            .join(Profile, Profile.id == WaitingList.user_id)
            .filter(
                WaitingList.match_id == match.id,
                WaitingList.status == "WAITING",
                or_(Profile.restricted_until.is_(None), Profile.restricted_until <= now_aware),
            )
            .order_by(WaitingList.position.asc())
            .first()
        )
        if next_entry is None:
            break
        next_entry.status = "NOTIFIED"
        next_entry.notified_at = now
        next_entry.expires_at = now + timedelta(minutes=OFFER_WINDOW_MINUTES)
        create_notification(
            db, next_entry.user_id, NotificationType.WAITING_LIST_OFFER,
            {
                "match_id": str(match.id),
                "entry_id": str(next_entry.id),
                "expires_at": next_entry.expires_at.isoformat() + "Z",  # UTC
            },
        )
        db.flush()  # so the next loop iteration doesn't pick the same entry again
        slots -= 1
        offered += 1
    return offered

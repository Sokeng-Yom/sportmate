from sqlalchemy.orm import Session

from app.core.clock import utc_now_naive
from app.models.match import Match
from app.models.waiting_list import WaitingList
from app.services.waiting_list_service import offer_open_slots


def expire_stale_waiting_list_entries(db: Session) -> int:
    """
    Marks NOTIFIED entries whose 30-minute window has passed as EXPIRED and offers
    each freed slot to the next WAITING entries. Runs every minute.

    Safe to run from several workers at once: each match is processed under a
    row lock, and a match that is locked (by another worker or by a leave/join
    request) is skipped and retried on the next tick.
    Returns how many entries were expired.
    """
    now = utc_now_naive()
    match_ids = [
        row[0]
        for row in db.query(WaitingList.match_id)
        .filter(WaitingList.status == "NOTIFIED", WaitingList.expires_at < now)
        .distinct()
        .all()
    ]

    expired_total = 0
    for match_id in match_ids:
        match = (
            db.query(Match)
            .filter(Match.id == match_id)
            .with_for_update(skip_locked=True)
            .first()
        )
        if match is None:
            continue

        stale = (
            db.query(WaitingList)
            .filter(
                WaitingList.match_id == match_id,
                WaitingList.status == "NOTIFIED",
                WaitingList.expires_at < now,
            )
            .all()
        )
        for entry in stale:
            entry.status = "EXPIRED"
        db.flush()

        offer_open_slots(db, match)  # does nothing for cancelled/completed matches
        db.commit()  # also releases the match lock
        expired_total += len(stale)

    return expired_total

from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.clock import utc_now_naive
from app.models.waiting_list import WaitingList


def expire_stale_waiting_list_entries(db: Session) -> int:
    """
    Marks every NOTIFIED entry whose 30-minute window has passed as EXPIRED,
    then offers the slot to the next WAITING entry for that match.
    Returns how many entries were expired. Runs on a 1-minute schedule.
    """
    now = utc_now_naive()
    stale_entries = (
        db.query(WaitingList)
        .filter(WaitingList.status == "NOTIFIED", WaitingList.expires_at < now)
        .all()
    )

    expired_count = 0
    for entry in stale_entries:
        entry.status = "EXPIRED"
        expired_count += 1

        next_entry = (
            db.query(WaitingList)
            .filter(
                WaitingList.match_id == entry.match_id,
                WaitingList.status == "WAITING",
                WaitingList.position > entry.position,
            )
            .order_by(WaitingList.position.asc())
            .first()
        )
        if next_entry:
            next_entry.status = "NOTIFIED"
            next_entry.notified_at = now
            next_entry.expires_at = now + timedelta(minutes=30)

    db.commit()
    return expired_count

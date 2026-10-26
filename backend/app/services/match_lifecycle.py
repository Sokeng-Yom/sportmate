from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.clock import local_now_naive
from app.core.enums import MatchStatus
from app.models.match import Match
from app.models.waiting_list import WaitingList

GRACE_HOURS = 3  # a match counts as over this long after its start time


def close_finished_matches(db: Session) -> int:
    """
    Moves matches that are over to their final state:
      FULL / CONFIRMED -> COMPLETED (it was played)
      OPEN             -> CANCELLED (it never filled up)
    and expires any waiting-list entries that are still open. Returns how many matches were closed.
    Safe with several workers: rows another worker holds are skipped (SKIP LOCKED).
    """
    cutoff = local_now_naive() - timedelta(hours=GRACE_HOURS)
    candidates = (
        db.query(Match)
        .filter(
            Match.status.in_([MatchStatus.OPEN, MatchStatus.FULL, MatchStatus.CONFIRMED]),
            Match.date <= cutoff.date(),
        )
        .with_for_update(skip_locked=True)
        .all()
    )
    closed = 0
    for match in candidates:
        if datetime.combine(match.date, match.time) > cutoff:
            continue
        match.status = MatchStatus.CANCELLED if match.status == MatchStatus.OPEN else MatchStatus.COMPLETED
        db.query(WaitingList).filter(
            WaitingList.match_id == match.id, WaitingList.status.in_(["WAITING", "NOTIFIED"])
        ).update({"status": "EXPIRED"}, synchronize_session=False)
        closed += 1
    db.commit()
    return closed

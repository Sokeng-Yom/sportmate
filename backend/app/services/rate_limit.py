from datetime import timedelta
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.clock import utc_now_naive


def count_recent(db: Session, user_column, created_column, user_id: UUID, window_seconds: int) -> int:
    """
    How many rows the user created in the last `window_seconds` (for example messages).
    Counted in the database, so the limit holds across several server workers.
    """
    since = utc_now_naive() - timedelta(seconds=window_seconds)
    return (
        db.query(func.count(created_column))
        .filter(user_column == user_id, created_column >= since)
        .scalar()
    )

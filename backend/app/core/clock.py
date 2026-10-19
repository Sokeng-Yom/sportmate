from datetime import datetime, timedelta, timezone

# Cambodia (Asia/Phnom_Penh) is a fixed UTC+7 with no daylight saving.
LOCAL_UTC_OFFSET = timedelta(hours=7)


def utc_now() -> datetime:
    """Timezone-AWARE UTC now. Use for timestamptz columns (profiles.restricted_until)."""
    return datetime.now(timezone.utc)


def utc_now_naive() -> datetime:
    """Naive UTC now. Use for Alembic-created `timestamp without time zone` columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def local_now_naive() -> datetime:
    """
    Naive Cambodia wall-clock now. Match, court and booking times are stored as local
    wall-clock times without a time zone, so compare them against this.
    """
    return utc_now_naive() + LOCAL_UTC_OFFSET

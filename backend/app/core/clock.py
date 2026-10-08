from datetime import datetime, timezone


def utc_now() -> datetime:
    """Timezone-AWARE UTC now. Use for timestamptz columns (profiles.restricted_until)."""
    return datetime.now(timezone.utc)


def utc_now_naive() -> datetime:
    """
    Naive UTC now. Use for Alembic-created `timestamp without time zone`
    columns (waiting_list.notified_at / expires_at, match_leaves.left_at).
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)

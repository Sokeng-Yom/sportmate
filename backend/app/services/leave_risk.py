from datetime import datetime, date, time

RISK_NORMAL = "NORMAL"
RISK_WARNING = "WARNING"
RISK_HIGH_RISK = "HIGH_RISK"
RISK_CRITICAL = "CRITICAL"

CRITICAL_RESTRICTION_DAYS = 3


def hours_remaining(match_date: date, match_time: time, now: datetime | None = None) -> float:
    now = now or datetime.utcnow()
    match_datetime = datetime.combine(match_date, match_time)
    delta = match_datetime - now
    return delta.total_seconds() / 3600


def classify_risk(hours_left: float) -> str:
    """
    Per the architecture doc (Section 24-B):
    > 24 hours  -> NORMAL
    4-24 hours  -> WARNING
    2-4 hours   -> HIGH_RISK
    < 2 hours   -> CRITICAL
    """
    if hours_left > 24:
        return RISK_NORMAL
    if hours_left > 4:
        return RISK_WARNING
    if hours_left > 2:
        return RISK_HIGH_RISK
    return RISK_CRITICAL

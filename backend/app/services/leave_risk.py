from datetime import date, datetime, time

from app.core.clock import local_now_naive

RISK_NORMAL = "NORMAL"
RISK_WARNING = "WARNING"
RISK_HIGH_RISK = "HIGH_RISK"
RISK_CRITICAL = "CRITICAL"

CRITICAL_RESTRICTION_DAYS = 3


def hours_remaining(match_date: date, match_time: time, now: datetime | None = None) -> float:
    """Match times are Cambodia local wall-clock times, so compare against local 'now'."""
    now = now or local_now_naive()
    delta = datetime.combine(match_date, match_time) - now
    return delta.total_seconds() / 3600


def classify_risk(hours_left: float) -> str:
    """> 24h NORMAL, 4-24h WARNING, 2-4h HIGH_RISK, < 2h CRITICAL (architecture Section 24-B)."""
    if hours_left > 24:
        return RISK_NORMAL
    if hours_left > 4:
        return RISK_WARNING
    if hours_left > 2:
        return RISK_HIGH_RISK
    return RISK_CRITICAL

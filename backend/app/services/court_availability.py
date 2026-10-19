from datetime import datetime, time

DAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")  # index = date.weekday()


def is_open(availability: dict | None, start: datetime, end: datetime) -> bool:
    """True if [start, end) lies inside one opening window of that weekday."""
    if not availability or start.date() != end.date():
        return False
    for window in availability.get(DAY_KEYS[start.weekday()], []):
        opens = time.fromisoformat(window["start"])
        closes = time.fromisoformat(window["end"])
        if opens <= start.time() and end.time() <= closes:
            return True
    return False

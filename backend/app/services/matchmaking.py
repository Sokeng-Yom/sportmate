from datetime import date, time, datetime, timedelta

# Weights per the architecture doc's matchmaking algorithm (Section 4/24-A)
WEIGHT_SPORT = 0.30
WEIGHT_SKILL = 0.25
WEIGHT_AVAILABILITY = 0.20
WEIGHT_LOCATION = 0.15
WEIGHT_RELIABILITY = 0.10

SKILL_ORDER = ["BEGINNER", "INTERMEDIATE", "ADVANCED"]


def sport_score(user_sports: list[str], match_sport: str) -> float:
    """1.0 if the player has listed this sport, else 0.0."""
    normalized_user_sports = {s.strip().lower() for s in user_sports}
    return 1.0 if match_sport.strip().lower() in normalized_user_sports else 0.0


def skill_score(user_skill_level: str | None, match_skill_level: str) -> float:
    """
    1.0 for an exact skill match, 0.5 for one level off (e.g. INTERMEDIATE vs
    ADVANCED), 0.0 for two levels off, 0.0 if the player hasn't logged a skill
    level for this sport at all.
    """
    if user_skill_level is None:
        return 0.0
    if user_skill_level not in SKILL_ORDER or match_skill_level not in SKILL_ORDER:
        return 0.0

    distance = abs(SKILL_ORDER.index(user_skill_level) - SKILL_ORDER.index(match_skill_level))
    if distance == 0:
        return 1.0
    if distance == 1:
        return 0.5
    return 0.0


def availability_score(preferred_date: date | None, match_date: date) -> float:
    """
    1.0 if the player didn't specify a preferred date (unconstrained search),
    1.0 for an exact date match, decaying by day for near dates, 0.0 beyond a week out.
    """
    if preferred_date is None:
        return 1.0
    days_off = abs((match_date - preferred_date).days)
    if days_off == 0:
        return 1.0
    if days_off >= 7:
        return 0.0
    return max(0.0, 1.0 - (days_off / 7))


def location_score(preferred_location: str | None, match_location: str) -> float:
    """1.0 if unconstrained or the match location contains the preferred text, else 0.0."""
    if not preferred_location or not preferred_location.strip():
        return 1.0
    return 1.0 if preferred_location.strip().lower() in match_location.strip().lower() else 0.0


def reliability_score(critical_leave_count: int, total_leave_count: int) -> float:
    """
    Based on the player's own leave history (Section 24-B risk tiers feed this):
    fewer critical leaves relative to total leaves means a higher reliability
    score. A player with no leave history at all gets a neutral 1.0 (benefit
    of the doubt for new users, rather than penalizing them for lack of data).
    """
    if total_leave_count == 0:
        return 1.0
    reliability = 1.0 - (critical_leave_count / total_leave_count)
    return max(0.0, reliability)


def compute_match_score(
    user_sports: list[str],
    user_skill_level: str | None,
    critical_leave_count: int,
    total_leave_count: int,
    match_sport: str,
    match_skill_level: str,
    match_date: date,
    match_location: str,
    preferred_date: date | None = None,
    preferred_location: str | None = None,
) -> float:
    score = (
        sport_score(user_sports, match_sport) * WEIGHT_SPORT
        + skill_score(user_skill_level, match_skill_level) * WEIGHT_SKILL
        + availability_score(preferred_date, match_date) * WEIGHT_AVAILABILITY
        + location_score(preferred_location, match_location) * WEIGHT_LOCATION
        + reliability_score(critical_leave_count, total_leave_count) * WEIGHT_RELIABILITY
    )
    return round(score, 4)

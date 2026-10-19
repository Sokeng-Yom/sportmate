from datetime import date as date_type

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.clock import local_now_naive
from app.core.enums import MatchStatus
from app.models.match import Match, MatchPlayer
from app.models.match_leave import MatchLeave
from app.models.user_sport import UserSport
from app.schemas.match import MatchRead
from app.services.leave_risk import RISK_CRITICAL
from app.services.matchmaking import compute_match_score

# Scoring happens in Python, so the work per request is capped. Candidates are the
# soonest upcoming matches; the cap only matters once thousands of matches are open at once.
MAX_CANDIDATES = 1000


def build_recommendations(
    db: Session,
    user_id: str,
    *,
    sport: str | None = None,
    preferred_date: date_type | None = None,
    location: str | None = None,
    min_score: float = 0.0,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    today = local_now_naive().date()  # match dates are Cambodia local dates

    sport_rows = db.query(UserSport.sport, UserSport.skill_level).filter(UserSport.user_id == user_id).all()
    user_sport_names = [name for name, _ in sport_rows]
    skill_by_sport = {name.lower(): level for name, level in sport_rows}

    total_leaves, critical_leaves = (
        db.query(
            func.count(MatchLeave.id),
            func.count(case((MatchLeave.risk_level == RISK_CRITICAL, 1))),
        )
        .filter(MatchLeave.user_id == user_id)
        .one()
    )

    already_joined = select(MatchPlayer.match_id).where(MatchPlayer.user_id == user_id)

    query = db.query(Match).filter(
        Match.status == MatchStatus.OPEN,
        Match.created_by != user_id,
        Match.date >= today,
        ~Match.id.in_(already_joined),
    )
    if sport:
        query = query.filter(func.lower(Match.sport) == sport.strip().lower())
    if location:
        query = query.filter(Match.location.ilike(f"%{location}%"))

    candidates = query.order_by(Match.date, Match.time, Match.id).limit(MAX_CANDIDATES).all()

    scored = []
    for match in candidates:
        score = compute_match_score(
            user_sports=user_sport_names,
            user_skill_level=skill_by_sport.get(match.sport.lower()),
            critical_leave_count=critical_leaves,
            total_leave_count=total_leaves,
            match_sport=match.sport,
            match_skill_level=match.skill_level,
            match_date=match.date,
            match_location=match.location,
            preferred_date=preferred_date,
            preferred_location=location,
        )
        if score >= min_score:
            scored.append((score, match))

    # Highest score first; equal scores keep the soonest match first.
    scored.sort(key=lambda pair: (-pair[0], pair[1].date, pair[1].time))

    start = (page - 1) * page_size
    items = []
    for score, match in scored[start : start + page_size]:
        item = MatchRead.model_validate(match).model_dump()
        item["score"] = score
        items.append(item)

    return {"items": items, "total": len(scored), "page": page, "page_size": page_size}

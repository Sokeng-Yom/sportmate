from datetime import date as date_type

from sqlalchemy.orm import Session

from app.core.enums import MatchStatus
from app.models.match import Match, MatchPlayer
from app.models.match_leave import MatchLeave
from app.models.user_sport import UserSport
from app.schemas.match import MatchRead
from app.services.leave_risk import RISK_CRITICAL
from app.services.matchmaking import compute_match_score


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
    user_sport_rows = db.query(UserSport).filter(UserSport.user_id == user_id).all()
    user_sport_names = [s.sport for s in user_sport_rows]
    skill_by_sport = {s.sport.lower(): s.skill_level for s in user_sport_rows}

    leaves = db.query(MatchLeave).filter(MatchLeave.user_id == user_id).all()
    total_leaves = len(leaves)
    critical_leaves = sum(1 for leave in leaves if leave.risk_level == RISK_CRITICAL)

    already_joined_ids = {
        row.match_id for row in db.query(MatchPlayer).filter(MatchPlayer.user_id == user_id).all()
    }

    query = db.query(Match).filter(Match.status == MatchStatus.OPEN, Match.created_by != user_id)
    if sport:
        query = query.filter(Match.sport == sport)
    if location:
        query = query.filter(Match.location.ilike(f"%{location}%"))

    candidates = [m for m in query.all() if m.id not in already_joined_ids]

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
            item = MatchRead.model_validate(match).model_dump()
            item["score"] = score
            scored.append(item)

    scored.sort(key=lambda m: m["score"], reverse=True)

    start = (page - 1) * page_size
    return {
        "items": scored[start : start + page_size],
        "total": len(scored),
        "page": page,
        "page_size": page_size,
    }

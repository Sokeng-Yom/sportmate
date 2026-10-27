from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.clock import local_now_naive, utc_now
from app.models.match import Match
from app.models.profile import Profile


def ensure_not_restricted(db: Session, user_id) -> None:
    """A restricted player cannot take part in matches: joining, queueing or accepting offers."""
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if profile and profile.restricted_until and profile.restricted_until > utc_now():
        raise HTTPException(
            status_code=403,
            detail=f"You are restricted from joining matches until {profile.restricted_until.isoformat()}",
        )


def ensure_not_started(match: Match) -> None:
    """Match times are Cambodia local times."""
    if datetime.combine(match.date, match.time) <= local_now_naive():
        raise HTTPException(status_code=400, detail="This match has already started")

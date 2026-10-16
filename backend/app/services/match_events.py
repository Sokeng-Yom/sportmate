from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.constants import NotificationType
from app.models.match import Match
from app.models.profile import Profile
from app.services.match_participants import participant_ids
from app.services.notifications import create_notification


def notify_player_joined(db: Session, match: Match, joiner_id: UUID, joiner_name: str, became_full: bool) -> None:
    """The creator hears about every new player; everyone hears when the match fills up."""
    if match.created_by != joiner_id:
        create_notification(
            db, match.created_by, NotificationType.MATCH_PLAYER_JOINED,
            {"match_id": str(match.id), "sport": match.sport, "user_id": str(joiner_id), "user_name": joiner_name},
        )
    if became_full:
        for user_id in participant_ids(db, match) | {joiner_id}:  # the joiner is not flushed yet
            create_notification(db, user_id, NotificationType.MATCH_FULL, {"match_id": str(match.id), "sport": match.sport})


def notify_player_left(db: Session, match: Match, leaver_id: UUID, risk_level: str) -> None:
    """Call after the leaver's row has been flushed away."""
    name = db.query(Profile.name).filter(Profile.id == leaver_id).scalar() or ""
    for user_id in participant_ids(db, match) - {leaver_id}:
        create_notification(
            db, user_id, NotificationType.MATCH_PLAYER_LEFT,
            {"match_id": str(match.id), "sport": match.sport, "user_id": str(leaver_id),
             "user_name": name, "risk_level": risk_level},
        )


def notify_restricted(db: Session, user_id: UUID, until: datetime) -> None:
    create_notification(
        db, user_id, NotificationType.ACCOUNT_RESTRICTED,
        {"until": until.isoformat(), "reason": "Critical late cancellation"},
    )

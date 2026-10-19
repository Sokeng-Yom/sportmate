from uuid import UUID

from sqlalchemy.orm import Session

from app.models.match import Match, MatchPlayer


def is_match_participant(db: Session, match: Match, user_id: UUID) -> bool:
    """A participant is the match creator or anyone who joined it."""
    if match.created_by == user_id:
        return True
    return (
        db.query(MatchPlayer.id)
        .filter(MatchPlayer.match_id == match.id, MatchPlayer.user_id == user_id)
        .first()
        is not None
    )


def participant_ids(db: Session, match: Match) -> set[UUID]:
    ids = {match.created_by}
    ids.update(
        row[0] for row in db.query(MatchPlayer.user_id).filter(MatchPlayer.match_id == match.id).all()
    )
    return ids

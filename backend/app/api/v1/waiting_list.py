import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.clock import utc_now_naive
from app.core.enums import MatchStatus
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.match import Match, MatchPlayer
from app.models.waiting_list import WaitingList
from app.schemas.lifecycle import WaitingListAccepted
from app.services.waiting_list_service import count_joined

router = APIRouter(prefix="/api/v1/waiting-list", tags=["waiting-list"])


@router.post(
    "/{entry_id}/accept",
    response_model=WaitingListAccepted,
    summary="Accept an offered waiting-list slot",
)
def accept_waiting_list_entry(
    entry_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(WaitingList).filter(WaitingList.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Waiting list entry not found")
    if str(entry.user_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="This waiting list entry does not belong to you")
    if entry.status != "NOTIFIED":
        raise HTTPException(status_code=400, detail=f"Cannot accept an entry with status {entry.status}")
    if entry.expires_at and entry.expires_at < utc_now_naive():
        entry.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="This offer has expired")

    match = db.query(Match).filter(Match.id == entry.match_id).with_for_update().first()
    joined = count_joined(db, entry.match_id)
    if joined >= match.players_needed:
        raise HTTPException(status_code=400, detail="Match is already full")

    entry.status = "ACCEPTED"
    db.add(MatchPlayer(id=uuid.uuid4(), match_id=entry.match_id, user_id=entry.user_id))
    if joined + 1 >= match.players_needed and match.status == MatchStatus.OPEN:
        match.status = MatchStatus.FULL  # a CONFIRMED (booked) match keeps its status

    db.commit()
    return {"status": "joined"}

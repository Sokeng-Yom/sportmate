import uuid
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user
from app.core.enums import MatchStatus
from app.db.session import get_db
from app.models.match import Match
from app.schemas.match import MatchCreate, MatchRead, MatchDetailRead, PaginatedMatches

router = APIRouter(prefix="/api/v1/matches", tags=["matches"])


@router.post("", response_model=MatchRead, status_code=201, summary="Create a match")
def create_match(payload: MatchCreate, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    match = Match(
        id=uuid.uuid4(),
        sport=payload.sport,
        location=payload.location,
        date=payload.date,
        time=payload.time,
        players_needed=payload.players_needed,
        skill_level=payload.skill_level,
        status=MatchStatus.OPEN,
        created_by=user["sub"],
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.get("", response_model=PaginatedMatches, summary="List matches")
def list_matches(
    sport: str | None = None,
    date: str | None = None,
    location: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Match)
    if sport:
        query = query.filter(Match.sport == sport)
    if date:
        query = query.filter(Match.date == date)
    if location:
        query = query.filter(Match.location.ilike(f"%{location}%"))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{match_id}", response_model=MatchDetailRead, summary="Get match detail")
def get_match(match_id: UUID, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    match = (
        db.query(Match)
        .options(joinedload(Match.players))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

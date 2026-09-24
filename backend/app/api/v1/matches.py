import uuid
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user
from app.core.enums import MatchStatus
from app.db.session import get_db
from app.models.match import Match
from app.schemas.match import MatchCreate, MatchRead, MatchDetailRead, PaginatedMatches

from sqlalchemy import select, func as sa_func
from app.models.match import MatchPlayer

from datetime import date as date_type

from app.models.user_sport import UserSport
from app.models.match_leave import MatchLeave
from app.schemas.match import RecommendedMatch
from app.services.matchmaking import compute_match_score

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

@router.post("/{match_id}/join", response_model=MatchDetailRead, summary="Join a match")
def join_match(match_id: UUID, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    with db.begin_nested():
        match = (
            db.query(Match)
            .filter(Match.id == match_id)
            .with_for_update()
            .first()
        )
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        if match.status not in (MatchStatus.OPEN,):
            raise HTTPException(status_code=400, detail=f"Cannot join a match with status {match.status}")

        already_joined = db.query(MatchPlayer).filter(
            MatchPlayer.match_id == match_id, MatchPlayer.user_id == user["sub"]
        ).first()
        if already_joined:
            raise HTTPException(status_code=400, detail="You have already joined this match")

        current_count = db.query(sa_func.count()).select_from(MatchPlayer).filter(
            MatchPlayer.match_id == match_id
        ).scalar()

        if current_count >= match.players_needed:
            raise HTTPException(status_code=400, detail="Match is full")

        db.add(MatchPlayer(id=uuid.uuid4(), match_id=match_id, user_id=user["sub"]))

        if current_count + 1 >= match.players_needed:
            match.status = MatchStatus.FULL

    db.commit()
    db.refresh(match)
    return match


@router.post("/{match_id}/leave", response_model=MatchDetailRead, summary="Leave a match")
def leave_match(match_id: UUID, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    entry = db.query(MatchPlayer).filter(
        MatchPlayer.match_id == match_id, MatchPlayer.user_id == user["sub"]
    ).first()
    if not entry:
        raise HTTPException(status_code=400, detail="You are not part of this match")

    db.delete(entry)

    # If the match was FULL and now has an open slot, reopen it
    if match.status == MatchStatus.FULL:
        match.status = MatchStatus.OPEN

    db.commit()
    db.refresh(match)
    return match


@router.patch("/{match_id}/cancel", response_model=MatchDetailRead, summary="Cancel a match (creator only)")
def cancel_match(match_id: UUID, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if str(match.created_by) != user["sub"]:
        raise HTTPException(status_code=403, detail="Only the match creator can cancel it")

    match.status = MatchStatus.CANCELLED
    db.commit()
    db.refresh(match)
    return match

@router.get("/recommended", response_model=list[RecommendedMatch], summary="Get ranked, scored match recommendations")
def recommended_matches(
    sport: str | None = None,
    date: date_type | None = None,
    location: str | None = None,
    min_score: float = 0.0,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user["sub"]

    # Player's own sports/skill levels
    user_sport_rows = db.query(UserSport).filter(UserSport.user_id == user_id).all()
    user_sport_names = [s.sport for s in user_sport_rows]
    skill_by_sport = {s.sport.lower(): s.skill_level for s in user_sport_rows}

    # Player's own leave history, for the reliability factor
    leaves = db.query(MatchLeave).filter(MatchLeave.user_id == user_id).all()
    total_leaves = len(leaves)
    critical_leaves = sum(1 for l in leaves if l.risk_level == "CRITICAL")

    # Candidate matches: OPEN only, not created by this user, not already joined
    already_joined_ids = {
        row.match_id for row in db.query(MatchPlayer).filter(MatchPlayer.user_id == user_id).all()
    }
    query = db.query(Match).filter(Match.status == "OPEN", Match.created_by != user_id)
    if sport:
        query = query.filter(Match.sport == sport)
    if location:
        query = query.filter(Match.location.ilike(f"%{location}%"))

    candidates = [m for m in query.all() if m.id not in already_joined_ids]

    scored = []
    for match in candidates:
        user_skill_for_this_sport = skill_by_sport.get(match.sport.lower())
        score = compute_match_score(
            user_sports=user_sport_names,
            user_skill_level=user_skill_for_this_sport,
            critical_leave_count=critical_leaves,
            total_leave_count=total_leaves,
            match_sport=match.sport,
            match_skill_level=match.skill_level,
            match_date=match.date,
            match_location=match.location,
            preferred_date=date,
            preferred_location=location,
        )
        if score >= min_score:
            match_dict = MatchRead.model_validate(match).model_dump()
            match_dict["score"] = score
            scored.append(match_dict)

    scored.sort(key=lambda m: m["score"], reverse=True)
    return scored

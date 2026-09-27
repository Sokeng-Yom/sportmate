import uuid
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user
from app.core.enums import MatchStatus
from app.db.session import get_db
from app.models.match import Match
from app.schemas.match import MatchCreate, MatchRead, MatchDetailRead, PaginatedMatches

from app.models.match import MatchPlayer

from datetime import date as date_type

from app.models.user_sport import UserSport
from app.models.match_leave import MatchLeave
from app.schemas.match import RecommendedMatch
from app.services.matchmaking import compute_match_score

from app.models.profile import Profile
from app.services.leave_risk import hours_remaining, classify_risk, CRITICAL_RESTRICTION_DAYS, RISK_CRITICAL
from app.models.waiting_list import WaitingList

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
    profile = db.query(Profile).filter(Profile.id == user["sub"]).first()
    if profile and profile.restricted_until and profile.restricted_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=403,
            detail=f"You are restricted from joining matches until {profile.restricted_until.isoformat()}",
        )
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

        current_count = db.query(func.count()).select_from(MatchPlayer).filter(
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

    hours_left = hours_remaining(match.date, match.time)
    risk_level = classify_risk(hours_left)

    db.add(MatchLeave(
        id=uuid.uuid4(),
        match_id=match_id,
        user_id=user["sub"],
        hours_before_match=hours_left,
        risk_level=risk_level,
    ))

    if risk_level == RISK_CRITICAL:
        profile = db.query(Profile).filter(Profile.id == user["sub"]).first()
        if profile:
            profile.restricted_until = datetime.now(timezone.utc) + timedelta(days=CRITICAL_RESTRICTION_DAYS)

    db.delete(entry)

    if match.status == MatchStatus.FULL:
        match.status = MatchStatus.OPEN
        _notify_next_waiting_list_entry(db, match_id)

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

def _notify_next_waiting_list_entry(db: Session, match_id: UUID):
    next_entry = (
        db.query(WaitingList)
        .filter(WaitingList.match_id == match_id, WaitingList.status == "WAITING")
        .order_by(WaitingList.position.asc())
        .first()
    )
    if next_entry:
        next_entry.status = "NOTIFIED"
        next_entry.notified_at = datetime.now(timezone.utc)
        next_entry.expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)


@router.post("/{match_id}/waiting-list", status_code=201, summary="Join a full match's waiting list")
def join_waiting_list(match_id: UUID, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status != MatchStatus.FULL:
        raise HTTPException(status_code=400, detail="Match is not full; join directly instead")

    existing = db.query(WaitingList).filter(
        WaitingList.match_id == match_id, WaitingList.user_id == user["sub"]
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already on the waiting list for this match")

    max_position = db.query(func.max(WaitingList.position)).filter(WaitingList.match_id == match_id).scalar() or 0

    entry = WaitingList(
        id=uuid.uuid4(),
        match_id=match_id,
        user_id=user["sub"],
        position=max_position + 1,
        status="WAITING",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "position": entry.position, "status": entry.status}


@router.post("/waiting-list/{entry_id}/accept", summary="Accept a waiting-list slot")
def accept_waiting_list_entry(entry_id: UUID, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(WaitingList).filter(WaitingList.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Waiting list entry not found")
    if str(entry.user_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="This waiting list entry does not belong to you")
    if entry.status != "NOTIFIED":
        raise HTTPException(status_code=400, detail=f"Cannot accept an entry with status {entry.status}")
    if entry.expires_at and entry.expires_at < datetime.now(timezone.utc):
        entry.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="This offer has expired")

    entry.status = "ACCEPTED"
    db.add(MatchPlayer(id=uuid.uuid4(), match_id=entry.match_id, user_id=entry.user_id))

    match = db.query(Match).filter(Match.id == entry.match_id).first()
    current_count = db.query(func.count()).select_from(MatchPlayer).filter(MatchPlayer.match_id == entry.match_id).scalar()
    if current_count >= match.players_needed:
        match.status = MatchStatus.FULL

    db.commit()
    return {"status": "joined"}

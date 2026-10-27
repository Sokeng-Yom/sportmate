import uuid
from datetime import date as date_type
from datetime import timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.clock import utc_now
from app.core.constants import BookingStatus, NotificationType
from app.core.enums import MatchStatus
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.booking import Booking
from app.models.match import Match, MatchPlayer
from app.models.match_leave import MatchLeave
from app.models.profile import Profile
from app.models.venue import Court
from app.models.waiting_list import WaitingList
from app.schemas.lifecycle import LeaveRiskPreview, WaitingListJoined
from app.schemas.match import (
    MatchCreate,
    MatchDetailRead,
    MatchRead,
    MatchUpdate,
    PaginatedMatches,
    PaginatedRecommendedMatches,
)
from app.services.leave_risk import (
    CRITICAL_RESTRICTION_DAYS,
    RISK_CRITICAL,
    classify_risk,
    hours_remaining,
)
from app.services.match_events import notify_player_joined, notify_player_left, notify_restricted
from app.services.match_participants import participant_ids
from app.services.notifications import create_notification
from app.services.join_rules import ensure_not_restricted, ensure_not_started
from app.services.recommendations import build_recommendations
from app.services.waiting_list_service import (
    count_joined_excluding_host,
    count_joined_excluding_hosts_for_matches,
    count_joined_for_matches,
    offer_open_slots,
    open_slots,
)

router = APIRouter(prefix="/api/v1/matches", tags=["matches"])
MatchSort = Literal["game_time", "posted_at"]

# Concurrency rule used by join / leave / waiting-list join / accept:
# lock the match row with SELECT ... FOR UPDATE first. Everything that changes
# who is in a match or who holds an offer then runs one-at-a-time per match.
# The lock lasts until commit, or until the request ends and the session closes.


# ---------------------------------------------------------------------------
# Fixed-path routes. These MUST be declared before any "/{match_id}" route,
# otherwise GET /recommended is captured as match_id="recommended".
# ---------------------------------------------------------------------------


@router.get("", response_model=PaginatedMatches, summary="List matches")
def list_matches(
    sport: str | None = None,
    date: date_type | None = None,
    location: str | None = None,
    skill_level: str | None = None,
    created_by_me: bool = False,
    joined_by_me: bool = False,
    status: str | None = None,
    sort_by: MatchSort = "game_time",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Match)
    if sport:
        query = query.filter(func.lower(Match.sport) == sport.strip().lower())
    if date:
        query = query.filter(Match.date == date)
    if location:
        query = query.filter(Match.location.ilike(f"%{location}%"))
    if skill_level:
        query = query.filter(func.lower(Match.skill_level) == skill_level.strip().lower())
    if status:
        statuses = [value.strip() for value in status.split(",") if value.strip()]
        query = query.filter(Match.status.in_(statuses))
    else:
        query = query.filter(Match.status != MatchStatus.CANCELLED)
    if created_by_me:
        query = query.filter(Match.created_by == user["sub"])
    if joined_by_me:
        joined_ids = [
            row.match_id
            for row in db.query(MatchPlayer).filter(MatchPlayer.user_id == user["sub"]).all()
        ]
        query = query.filter(Match.id.in_(joined_ids))

    total = query.count()
    # A stable ORDER BY is required for pagination, otherwise pages can overlap or skip rows.
    ordering = (
        (Match.created_at.desc(), Match.id)
        if sort_by == "posted_at"
        else (Match.date, Match.time, Match.id)
    )
    matches = (
        query.options(joinedload(Match.creator))
        .order_by(*ordering)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    joined_counts = count_joined_for_matches(db, [match.id for match in matches])
    joined_counts_excluding_hosts = count_joined_excluding_hosts_for_matches(
        db, [match.id for match in matches]
    )
    items = [
        {
            **MatchRead.model_validate(match).model_dump(),
            "joined_count": joined_counts.get(match.id, 0),
            "joined_count_excluding_host": joined_counts_excluding_hosts.get(match.id, 0),
        }
        for match in matches
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get(
    "/recommended",
    response_model=PaginatedRecommendedMatches,
    summary="Get ranked, scored match recommendations",
)
def recommended_matches(
    sport: str | None = None,
    date: date_type | None = None,
    location: str | None = None,
    min_score: float = 0.0,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_recommendations(
        db,
        user["sub"],
        sport=sport,
        preferred_date=date,
        location=location,
        min_score=min_score,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=MatchRead, status_code=201, summary="Create a match")
def create_match(
    payload: MatchCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    court = None
    if payload.court_id is not None:
        court = (
            db.query(Court)
            .filter(Court.id == payload.court_id)
            .first()
        )
        if court is None or court.venue.status != "APPROVED":
            raise HTTPException(status_code=404, detail="Court not found")
        if court.sport.strip().lower() != payload.sport.strip().lower():
            raise HTTPException(
                status_code=400,
                detail=f"This court is for {court.sport}, but the match is {payload.sport}",
            )
    match = Match(
        id=uuid.uuid4(),
        sport=payload.sport,
        location=payload.location,
        date=payload.date,
        time=payload.time,
        players_needed=payload.players_needed,
        skill_level=payload.skill_level,
        status=MatchStatus.OPEN,
        court_id=court.id if court else None,
        court_duration_minutes=payload.court_duration_minutes,
        created_by=user["sub"],
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


# ---------------------------------------------------------------------------
# Parameterized routes: /{match_id}...
# ---------------------------------------------------------------------------


@router.get("/{match_id}", response_model=MatchDetailRead, summary="Get match detail")
def get_match(
    match_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = (
        db.query(Match)
        .options(joinedload(Match.players), joinedload(Match.creator))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.patch("/{match_id}", response_model=MatchDetailRead, summary="Update a hosted match")
def update_match(
    match_id: UUID,
    payload: MatchUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = db.query(Match).filter(Match.id == match_id).with_for_update().first()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    if str(match.created_by) != user["sub"]:
        raise HTTPException(status_code=403, detail="Only the match creator can edit it")
    if match.status in (MatchStatus.CANCELLED, MatchStatus.COMPLETED):
        raise HTTPException(status_code=400, detail="A cancelled or completed match cannot be edited")
    updates = payload.model_dump(exclude_unset=True)
    proposed_sport = updates.get("sport", match.sport)
    proposed_date = updates.get("date", match.date)
    proposed_time = updates.get("time", match.time)

    joined_count = count_joined_excluding_host(db, match.id)
    if updates.get("players_needed", match.players_needed) < joined_count:
        raise HTTPException(
            status_code=400,
            detail=f"Players needed cannot be fewer than the {joined_count} players already joined",
        )

    active_booking = (
        db.query(Booking.id)
        .filter(
            Booking.match_id == match.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
        .first()
        is not None
    )
    if match.court_id is not None:
        court = db.query(Court).filter(Court.id == match.court_id).first()
        if court is not None and court.sport.strip().lower() != proposed_sport.strip().lower():
            raise HTTPException(
                status_code=400,
                detail=f"This court is for {court.sport}, but the match is {proposed_sport}",
            )
    if active_booking and (
        proposed_sport != match.sport
        or proposed_date != match.date
        or proposed_time != match.time
    ):
        raise HTTPException(
            status_code=400,
            detail="Cancel the active court booking before changing the sport, date, or time",
        )

    for field, value in updates.items():
        setattr(match, field, value)
    if match.status != MatchStatus.CONFIRMED:
        match.status = (
            MatchStatus.FULL
            if joined_count >= match.players_needed
            else MatchStatus.OPEN
        )
    db.commit()
    db.refresh(match)
    return match


@router.get(
    "/{match_id}/leave-risk-preview",
    response_model=LeaveRiskPreview,
    summary="Preview the leave-risk tier without actually leaving",
)
def leave_risk_preview(
    match_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status in (MatchStatus.CANCELLED, MatchStatus.COMPLETED):
        raise HTTPException(
            status_code=400,
            detail="Cannot preview leaving a cancelled or completed match",
        )

    is_participant = (
        db.query(MatchPlayer)
        .filter(MatchPlayer.match_id == match_id, MatchPlayer.user_id == user["sub"])
        .first()
    )
    if not is_participant:
        raise HTTPException(status_code=400, detail="You are not part of this match")

    hours_left = hours_remaining(match.date, match.time)
    risk_level = classify_risk(hours_left)
    return {
        "risk_level": risk_level,
        "hours_remaining": round(hours_left, 2),
        "will_restrict": risk_level == RISK_CRITICAL,
        "restriction_days": CRITICAL_RESTRICTION_DAYS if risk_level == RISK_CRITICAL else 0,
    }


@router.post("/{match_id}/join", response_model=MatchDetailRead, summary="Join a match")
def join_match(
    match_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user["sub"]

    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if profile and profile.restricted_until and profile.restricted_until > utc_now():
        raise HTTPException(
            status_code=403,
            detail=f"You are restricted from joining matches until {profile.restricted_until.isoformat()}",
        )

    match = db.query(Match).filter(Match.id == match_id).with_for_update().first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status not in (MatchStatus.OPEN, MatchStatus.FULL, MatchStatus.CONFIRMED):
        raise HTTPException(status_code=400, detail=f"Cannot join a match with status {match.status}")
    ensure_not_started(match)

    already_joined = (
        db.query(MatchPlayer)
        .filter(MatchPlayer.match_id == match_id, MatchPlayer.user_id == user_id)
        .first()
    )
    if already_joined:
        raise HTTPException(status_code=400, detail="You have already joined this match")

    joined = count_joined_excluding_host(db, match_id)
    if match.status == MatchStatus.FULL and joined < match.players_needed:
        match.status = MatchStatus.OPEN
    if joined >= match.players_needed:
        raise HTTPException(status_code=400, detail="Match is full")
    if open_slots(db, match, for_user_id=user_id) <= 0:
        raise HTTPException(
            status_code=400,
            detail="The remaining slots are reserved for players on the waiting list",
        )

    # If this user was offered a slot, joining uses that offer up.
    own_offer = (
        db.query(WaitingList)
        .filter(
            WaitingList.match_id == match_id,
            WaitingList.user_id == user_id,
            WaitingList.status == "NOTIFIED",
        )
        .first()
    )
    if own_offer:
        own_offer.status = "ACCEPTED"

    db.add(MatchPlayer(id=uuid.uuid4(), match_id=match_id, user_id=user_id))
    became_full = joined + 1 >= match.players_needed
    if became_full and match.status == MatchStatus.OPEN:
        match.status = MatchStatus.FULL  # a CONFIRMED (booked) match keeps its status
    notify_player_joined(db, match, uuid.UUID(str(user_id)), profile.name if profile else "", became_full)

    try:
        db.commit()
    except IntegrityError:  # the unique constraint caught a duplicate the checks missed
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already joined this match")

    db.refresh(match)
    return match


@router.post("/{match_id}/leave", response_model=MatchDetailRead, summary="Leave a match")
def leave_match(
    match_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = db.query(Match).filter(Match.id == match_id).with_for_update().first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status in (MatchStatus.CANCELLED, MatchStatus.COMPLETED):
        raise HTTPException(
            status_code=400,
            detail="Cannot leave a cancelled or completed match",
    )
    entry = (
        db.query(MatchPlayer)
        .filter(MatchPlayer.match_id == match_id, MatchPlayer.user_id == user["sub"])
        .first()
    )
    if not entry:
        raise HTTPException(status_code=400, detail="You are not part of this match")

    hours_left = hours_remaining(match.date, match.time)
    risk_level = classify_risk(hours_left)

    db.add(
        MatchLeave(
            id=uuid.uuid4(),
            match_id=match_id,
            user_id=user["sub"],
            hours_before_match=hours_left,
            risk_level=risk_level,
        )
    )

    if risk_level == RISK_CRITICAL:
        profile = db.query(Profile).filter(Profile.id == user["sub"]).first()
        if profile:
            profile.restricted_until = utc_now() + timedelta(days=CRITICAL_RESTRICTION_DAYS)
            notify_restricted(db, profile.id, profile.restricted_until)

    db.delete(entry)
    db.flush()  # autoflush is off: make the delete visible before counting slots

    if match.status == MatchStatus.FULL:
        match.status = MatchStatus.OPEN
    offer_open_slots(db, match)  # one offer per free slot, not just the first
    notify_player_left(db, match, uuid.UUID(str(user["sub"])), risk_level)

    db.commit()
    db.refresh(match)
    return match


@router.patch(
    "/{match_id}/cancel",
    response_model=MatchDetailRead,
    summary="Cancel a match (creator only)",
)
def cancel_match(
    match_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = db.query(Match).filter(Match.id == match_id).with_for_update().first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if str(match.created_by) != user["sub"]:
        raise HTTPException(status_code=403, detail="Only the match creator can cancel it")
    if match.status == MatchStatus.CANCELLED:
        raise HTTPException(
            status_code=400,
            detail="Match is already cancelled",
    )

    booking = (
        db.query(Booking)
        .filter(
            Booking.match_id == match.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
        .with_for_update()
        .first()
    )
    if booking:
        booking.status = BookingStatus.CANCELLED
        court = db.query(Court).filter(Court.id == booking.court_id).first()
        if court:
            owner_id = court.venue.owner_id
            create_notification(
                db,
                owner_id,
                NotificationType.BOOKING_CANCELLED,
                {
                    "match_id": str(match.id),
                    "venue_name": court.venue.name,
                    "court_name": court.name,
                },
            )
        for participant_id in participant_ids(db, match):
            create_notification(
                db,
                participant_id,
                NotificationType.BOOKING_CANCELLED,
                {
                    "match_id": str(match.id),
                    "venue_name": court.venue.name if court else match.location,
                    "court_name": court.name if court else "",
                },
            )
    match.status = MatchStatus.CANCELLED
    db.commit()
    db.expire(match, ["bookings"])
    db.refresh(match)
    return match


@router.post(
    "/{match_id}/waiting-list",
    response_model=WaitingListJoined,
    status_code=201,
    summary="Join a full match's waiting list",
)
def join_waiting_list(
    match_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user["sub"]

    ensure_not_restricted(db, user_id)

    # Lock first: positions are max()+1, so two simultaneous waiters must queue up here.
    match = db.query(Match).filter(Match.id == match_id).with_for_update().first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status not in (MatchStatus.OPEN, MatchStatus.FULL, MatchStatus.CONFIRMED):
        raise HTTPException(status_code=400, detail=f"Cannot join the waiting list of a {match.status} match")
    ensure_not_started(match)

    # A match counts as "full" for waiting purposes when nothing is left for this user
    # (all players in, or every free slot is held for someone else's offer).
    if open_slots(db, match, for_user_id=user_id) > 0:
        raise HTTPException(status_code=400, detail="Match is not full; join directly instead")

    already_playing = (
        db.query(MatchPlayer)
        .filter(MatchPlayer.match_id == match_id, MatchPlayer.user_id == user_id)
        .first()
    )
    if already_playing:
        raise HTTPException(status_code=400, detail="You are already in this match")

    existing = (
        db.query(WaitingList)
        .filter(WaitingList.match_id == match_id, WaitingList.user_id == user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already on the waiting list for this match")

    max_position = (
        db.query(func.max(WaitingList.position)).filter(WaitingList.match_id == match_id).scalar() or 0
    )
    entry = WaitingList(
        id=uuid.uuid4(),
        match_id=match_id,
        user_id=user_id,
        position=max_position + 1,
        status="WAITING",
    )
    db.add(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Already on the waiting list for this match")

    db.refresh(entry)
    return {"id": entry.id, "position": entry.position, "status": entry.status}

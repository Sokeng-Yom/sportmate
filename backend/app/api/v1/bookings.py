"""
Locking order for everything here: MATCH row first, then COURT row. Keeping one order means two
requests can never wait on each other in a circle (deadlock). The database exclusion constraint
is the final safety net; IntegrityError is turned into a 409.
"""
import uuid
from datetime import date as date_type
from datetime import datetime, time, timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.clock import local_now_naive
from app.core.constants import BookingStatus, NotificationType
from app.core.deps import get_current_profile, require_profile_role
from app.core.enums import MatchStatus, VenueStatus
from app.db.session import get_db
from app.models.booking import Booking
from app.models.match import Match, MatchPlayer
from app.models.profile import Profile
from app.models.venue import Court, Venue
from app.schemas.booking import BookingCreate, BookingRead, PaginatedBookings
from app.services.court_availability import is_open
from app.services.match_participants import is_match_participant, participant_ids
from app.services.notifications import create_notification
from app.services.security_log import log_security_event
from app.services.venue_access import can_manage, get_venue_or_404
from app.services.waiting_list_service import count_joined_excluding_host

router = APIRouter(prefix="/api/v1", tags=["bookings"])

StatusFilter = Literal["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"]


def _read(booking: Booking, court: Court, venue: Venue, booker_name: str | None = None) -> dict:
    data = BookingRead.model_validate(booking).model_dump()
    data.update(
        court_name=court.name,
        venue_id=venue.id,
        venue_name=venue.name,
        booker_name=booker_name,
    )
    return data


def _page(rows, total: int, page: int, page_size: int, db: Session) -> dict:
    return {
        "items": [
            _read(
                booking,
                court,
                venue,
                db.query(Profile.name).filter(Profile.id == booking.booked_by).scalar(),
            )
            for booking, court, venue in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/bookings", response_model=BookingRead, status_code=201, summary="Book a court for a full match")
def create_booking(
    payload: BookingCreate,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    match = db.query(Match).filter(Match.id == payload.match_id).with_for_update().first()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    if not is_match_participant(db, match, profile.id):
        raise HTTPException(status_code=403, detail="Only participants of the match can book a court")
    if match.status == MatchStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="This match already has a confirmed booking")
    if match.status != MatchStatus.FULL:
        raise HTTPException(status_code=400, detail="A court can only be booked once the match is full")
    active_booking = (
        db.query(Booking.id)
        .filter(
            Booking.match_id == match.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
        .first()
    )
    if active_booking:
        raise HTTPException(status_code=400, detail="This match already has an active court booking request")
    if match.court_id is not None and match.court_id != payload.court_id:
        raise HTTPException(status_code=400, detail="Use the court selected for this match")
    if (
        match.court_duration_minutes is not None
        and match.court_duration_minutes != payload.duration_minutes
    ):
        raise HTTPException(status_code=400, detail="Use the duration selected for this match")

    start = datetime.combine(match.date, match.time)
    end = start + timedelta(minutes=payload.duration_minutes)
    if start <= local_now_naive():
        raise HTTPException(status_code=400, detail="The match start time has already passed")

    court = db.query(Court).filter(Court.id == payload.court_id).with_for_update().first()
    venue = db.query(Venue).filter(Venue.id == court.venue_id).first() if court else None
    if court is None or venue is None or venue.status != VenueStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Court not found")
    if court.sport.strip().lower() != match.sport.strip().lower():
        raise HTTPException(status_code=400, detail=f"This court is for {court.sport}, but the match is {match.sport}")
    if not is_open(court.availability, start, end):
        raise HTTPException(status_code=400, detail="The court is closed at that time")

    clash = (
        db.query(Booking.id)
        .filter(
            Booking.court_id == court.id,
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_time < end,
            Booking.end_time > start,
        )
        .first()
    )
    if clash:
        raise HTTPException(status_code=409, detail="This court is already booked at that time")

    booking = Booking(
        id=uuid.uuid4(),
        court_id=court.id,
        match_id=match.id,
        booked_by=profile.id,
        start_time=start,
        end_time=end,
        status=BookingStatus.PENDING,
    )
    if match.court_id is None:
        match.court_id = court.id
        match.court_duration_minutes = payload.duration_minutes
    db.add(booking)
    create_notification(
        db,
        venue.owner_id,
        NotificationType.BOOKING_REQUESTED,
        {
            "match_id": str(match.id),
            "venue_name": venue.name,
            "court_name": court.name,
            "start_time": start.isoformat(),
        },
    )
    log_security_event(
        db, "COURT_BOOKING_REQUESTED", user_id=profile.id, request=request,
        details=f"match_id={match.id}; court_id={court.id}; start={start.isoformat()}",
    )

    try:
        db.commit()
    except IntegrityError:  # the exclusion / unique constraints caught what the checks missed
        db.rollback()
        raise HTTPException(status_code=409, detail="This match already has an active booking request")
    db.refresh(booking)
    db.expire(match, ["bookings"])
    return _read(booking, court, venue, profile.name)


def _booking_for_venue_decision(
    booking_id: UUID,
    profile: Profile,
    db: Session,
) -> tuple[Booking, Match | None, Court, Venue]:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    match = None
    if booking.match_id:
        match = db.query(Match).filter(Match.id == booking.match_id).with_for_update().first()
    booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
    court = db.query(Court).filter(Court.id == booking.court_id).with_for_update().first()
    if court is None:
        raise HTTPException(status_code=404, detail="Court not found")
    venue = get_venue_or_404(db, court.venue_id)
    if not can_manage(profile, venue):
        raise HTTPException(status_code=403, detail="You do not manage this venue")
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Only pending booking requests can be reviewed (current status: {booking.status})",
        )
    return booking, match, court, venue


@router.post("/bookings/{booking_id}/approve", response_model=BookingRead, summary="Approve a court booking request")
def approve_booking(
    booking_id: UUID,
    request: Request,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    booking, match, court, venue = _booking_for_venue_decision(booking_id, profile, db)
    if match is None:
        raise HTTPException(status_code=400, detail="Only match bookings can be approved")
    if match.status != MatchStatus.FULL:
        raise HTTPException(status_code=400, detail="The match is no longer full")
    if booking.start_time <= local_now_naive():
        raise HTTPException(status_code=400, detail="This booking request has already started")
    if not is_open(court.availability, booking.start_time, booking.end_time):
        raise HTTPException(status_code=400, detail="The court is no longer available at that time")

    clash = (
        db.query(Booking.id)
        .filter(
            Booking.court_id == court.id,
            Booking.id != booking.id,
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_time < booking.end_time,
            Booking.end_time > booking.start_time,
        )
        .first()
    )
    if clash:
        raise HTTPException(status_code=409, detail="This court is already booked at that time")

    booking.status = BookingStatus.CONFIRMED
    match.status = MatchStatus.CONFIRMED
    for user_id in participant_ids(db, match):
        create_notification(
            db,
            user_id,
            NotificationType.BOOKING_CONFIRMED,
            {
                "match_id": str(match.id),
                "venue_name": venue.name,
                "court_name": court.name,
                "start_time": booking.start_time.isoformat(),
                "end_time": booking.end_time.isoformat(),
            },
        )
    log_security_event(
        db,
        "COURT_BOOKING_APPROVED",
        user_id=profile.id,
        request=request,
        details=f"booking_id={booking.id}; match_id={match.id}",
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This court is already booked at that time")
    db.refresh(booking)
    db.expire(match, ["bookings"])
    booker_name = db.query(Profile.name).filter(Profile.id == booking.booked_by).scalar()
    return _read(booking, court, venue, booker_name)


@router.post("/bookings/{booking_id}/reject", response_model=BookingRead, summary="Reject a court booking request")
def reject_booking(
    booking_id: UUID,
    request: Request,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    booking, match, court, venue = _booking_for_venue_decision(booking_id, profile, db)
    booking.status = BookingStatus.REJECTED
    if match:
        for user_id in participant_ids(db, match):
            create_notification(
                db,
                user_id,
                NotificationType.BOOKING_REJECTED,
                {
                    "match_id": str(match.id),
                    "venue_name": venue.name,
                    "court_name": court.name,
                    "start_time": booking.start_time.isoformat(),
                },
            )
    log_security_event(
        db,
        "COURT_BOOKING_REJECTED",
        user_id=profile.id,
        request=request,
        details=f"booking_id={booking.id}; match_id={match.id if match else ''}",
    )
    db.commit()
    db.refresh(booking)
    if match:
        db.expire(match, ["bookings"])
    booker_name = db.query(Profile.name).filter(Profile.id == booking.booked_by).scalar()
    return _read(booking, court, venue, booker_name)


@router.get("/bookings", response_model=PaginatedBookings, summary="My bookings (as booker or match participant)")
def my_bookings(
    status: StatusFilter | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    joined_matches = select(MatchPlayer.match_id).where(MatchPlayer.user_id == profile.id)
    created_matches = select(Match.id).where(Match.created_by == profile.id)
    query = (
        db.query(Booking, Court, Venue)
        .join(Court, Court.id == Booking.court_id)
        .join(Venue, Venue.id == Court.venue_id)
        .filter(
            or_(
                Booking.booked_by == profile.id,
                Booking.match_id.in_(joined_matches),
                Booking.match_id.in_(created_matches),
            )
        )
    )
    if status:
        query = query.filter(Booking.status == status)
    total = query.count()
    rows = query.order_by(Booking.start_time.desc(), Booking.id).offset((page - 1) * page_size).limit(page_size).all()
    return _page(rows, total, page, page_size, db)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingRead, summary="Cancel a booking")
def cancel_booking(
    booking_id: UUID,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    court = db.query(Court).filter(Court.id == booking.court_id).first()
    venue = get_venue_or_404(db, court.venue_id)
    if booking.booked_by != profile.id and not can_manage(profile, venue):
        raise HTTPException(status_code=403, detail="Only the booker or the venue's owner can cancel this booking")

    match = None
    if booking.match_id:  # same lock order as create_booking: match first
        match = db.query(Match).filter(Match.id == booking.match_id).with_for_update().first()
    booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        raise HTTPException(status_code=400, detail="Only pending or confirmed bookings can be cancelled")

    was_confirmed = booking.status == BookingStatus.CONFIRMED
    booking.status = BookingStatus.CANCELLED
    if match is not None and was_confirmed:
        if match.status == MatchStatus.CONFIRMED:
            joined = count_joined_excluding_host(db, match.id)
            match.status = MatchStatus.FULL if joined >= match.players_needed else MatchStatus.OPEN
        for user_id in participant_ids(db, match):
            create_notification(
                db, user_id, NotificationType.BOOKING_CANCELLED,
                {"match_id": str(match.id), "venue_name": venue.name, "court_name": court.name},
            )
    log_security_event(
        db, "BOOKING_CANCELLED", user_id=profile.id, request=request, details=f"booking_id={booking.id}"
    )
    db.commit()
    db.refresh(booking)
    return _read(booking, court, venue)


@router.get(
    "/venues/{venue_id}/bookings",
    response_model=PaginatedBookings,
    summary="Bookings of a venue (owner or admin)",
)
def venue_bookings(
    venue_id: UUID,
    status: StatusFilter | None = None,
    date: date_type | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    venue = get_venue_or_404(db, venue_id)
    if not can_manage(profile, venue):
        raise HTTPException(status_code=403, detail="You do not manage this venue")

    query = (
        db.query(Booking, Court, Venue)
        .join(Court, Court.id == Booking.court_id)
        .join(Venue, Venue.id == Court.venue_id)
        .filter(Venue.id == venue.id)
    )
    if status:
        query = query.filter(Booking.status == status)
    if date:
        day_start = datetime.combine(date, time.min)
        query = query.filter(Booking.start_time >= day_start, Booking.start_time < day_start + timedelta(days=1))
    total = query.count()
    rows = query.order_by(Booking.start_time, Booking.id).offset((page - 1) * page_size).limit(page_size).all()
    return _page(rows, total, page, page_size, db)

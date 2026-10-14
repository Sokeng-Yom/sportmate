from datetime import date as date_type
from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import exists, func, or_
from sqlalchemy.orm import Session

from app.core.clock import local_now_naive
from app.core.constants import BookingStatus
from app.core.deps import get_current_profile
from app.core.enums import VenueStatus
from app.core.search import contains_pattern
from app.db.session import get_db
from app.models.booking import Booking
from app.models.profile import Profile
from app.models.venue import Court, Venue
from app.schemas.court import CourtRead, PaginatedCourtSearch
from app.services.court_availability import is_open

# Included in router.py BEFORE the courts router, otherwise "/courts/{court_id}" would capture "search".
router = APIRouter(prefix="/api/v1/courts", tags=["courts"])

MAX_CANDIDATES = 500


@router.get(
    "/search",
    response_model=PaginatedCourtSearch,
    summary="Find courts that are free at a given date and time",
)
def search_courts(
    date: date_type,
    start_time: time,
    duration_minutes: int = Query(60, ge=30, le=240),
    sport: str | None = Query(None, max_length=50),
    location: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    start = datetime.combine(date, start_time)
    end = start + timedelta(minutes=duration_minutes)
    if start <= local_now_naive():
        raise HTTPException(status_code=400, detail="The start time must be in the future")
    if end.date() != start.date():
        raise HTTPException(status_code=400, detail="A booking cannot cross midnight")

    already_booked = exists().where(
        Booking.court_id == Court.id,
        Booking.status == BookingStatus.CONFIRMED,
        Booking.start_time < end,
        Booking.end_time > start,
    ).correlate(Court)

    query = (
        db.query(Court, Venue)
        .join(Venue, Venue.id == Court.venue_id)
        .filter(Venue.status == VenueStatus.APPROVED, ~already_booked)
    )
    if sport and sport.strip():
        query = query.filter(func.lower(Court.sport) == sport.strip().lower())
    if location and location.strip():
        pattern = contains_pattern(location.strip())
        query = query.filter(
            or_(Venue.address.ilike(pattern, escape="\\"), Venue.name.ilike(pattern, escape="\\"))
        )
    
    print("SEARCH SLOT:", start, "to", end)

    overlapping_bookings = (
        db.query(Booking)
        .filter(
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_time < end,
            Booking.end_time > start,
        )
        .all()
    )

    for booking in overlapping_bookings:
        print(
            "BOOKING:",
            "court_id =", booking.court_id,
            "start =", booking.start_time,
            "end =", booking.end_time,
            "status =", booking.status,
        )

    # candidates = query.order_by(Venue.name, Court.name, Court.id).limit(MAX_CANDIDATES).all()
    # # Opening hours live in JSON, so they are checked in Python on the (already filtered) candidates.
    # available = [(court, venue) for court, venue in candidates if is_open(court.availability, start, end)]
    
    candidates = (
        query.order_by(Venue.name, Court.name, Court.id)
        .limit(MAX_CANDIDATES)
        .all()
    )

    available = []

    for court, venue in candidates:
        if is_open(court.availability, start, end):
            available.append((court, venue))

    page_rows = available[(page - 1) * page_size : page * page_size]
    items = []
    for court, venue in page_rows:
        item = CourtRead.model_validate(court).model_dump()
        item.update(venue_name=venue.name, venue_address=venue.address)
        items.append(item)
    return {"items": items, "total": len(available), "page": page, "page_size": page_size}

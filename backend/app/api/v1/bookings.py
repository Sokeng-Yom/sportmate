"""
Locking order for everything here: MATCH row first, then COURT row. Keeping one order means two
requests can never wait on each other in a circle (deadlock). The database exclusion constraint
is the final safety net; IntegrityError is turned into a 409.
"""

import uuid
from datetime import date as date_type
from datetime import datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.clock import local_now_naive
from app.core.constants import BookingStatus, NotificationType
from app.core.deps import get_current_profile, require_profile_role
from app.core.enums import MatchStatus, VenueStatus
from app.db.session import get_db
from app.models.booking import Booking, BookingTransaction
from app.models.match import Match, MatchPlayer
from app.models.profile import Profile
from app.models.venue import Court, Venue
from app.models.venue_direct_chat import VenueDirectMessage
from app.models.venue_marketing import VenueDiscount
from app.schemas.booking import (
    BookingCreate,
    BookingQuoteCreate,
    BookingQuoteRead,
    BookingRead,
    BookingReject,
    PaginatedBookings,
)
from app.services.court_availability import is_open
from app.services.match_participants import participant_ids
from app.services.notifications import create_notification
from app.services.security_log import log_security_event
from app.services.venue_access import can_manage, get_venue_or_404
from app.services.waiting_list_service import count_joined_excluding_host
from app.services.venue_direct_chat import get_or_create_venue_direct_conversation

router = APIRouter(prefix="/api/v1", tags=["bookings"])

StatusFilter = Literal["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"]


def _add_booking_decision_message(
    db: Session,
    profile: Profile,
    match: Match,
    venue: Venue,
    court_names: str,
    booking: Booking,
    *,
    confirmed: bool,
    reason: str | None = None,
) -> None:
    conversation = get_or_create_venue_direct_conversation(db, venue.owner_id, booking.booked_by)

    date = booking.start_time.strftime("%b %d, %Y")
    start = booking.start_time.strftime("%I:%M %p")
    end = booking.end_time.strftime("%I:%M %p")
    if confirmed:
        content = (
            "Your court booking is confirmed.\n"
            f"Venue: {venue.name}\n"
            f"Court: {court_names}\n"
            f"Date: {date}\n"
            f"Time: {start} – {end}"
        )
    else:
        content = (
            "Your court booking request was declined.\n"
            f"Venue: {venue.name}\n"
            f"Court: {court_names}\n"
            f"Date: {date}\n"
            f"Time: {start} – {end}\n"
            f"Reason: {reason}"
        )
    db.add(
        VenueDirectMessage(
            id=uuid.uuid4(),
            conversation_id=conversation.id,
            sender_id=profile.id,
            content=content,
        )
    )


def _read(
    booking: Booking,
    court: Court,
    venue: Venue,
    booker_name: str | None = None,
    db: Session | None = None,
) -> dict:
    data = BookingRead.model_validate(booking).model_dump()
    line_total = None
    if booking.price_per_hour is not None:
        minutes = int((booking.end_time - booking.start_time).total_seconds() // 60)
        line_total = (booking.price_per_hour * Decimal(minutes) / Decimal(60)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    data.update(
        court_name=court.name,
        venue_id=venue.id,
        venue_name=venue.name,
        booker_name=booker_name,
        price_per_hour=booking.price_per_hour,
        line_total=line_total,
    )
    transaction = booking.transaction
    if transaction:
        data.update(
            transaction_id=transaction.id,
            original_total=transaction.original_total,
            discount_amount=transaction.discount_amount,
            final_total=transaction.final_total,
            promo_code=transaction.promo_code,
        )
        if db is not None:
            data["selected_court_names"] = [
                name
                for (name,) in (
                    db.query(Court.name)
                    .join(Booking, Booking.court_id == Court.id)
                    .filter(Booking.transaction_id == transaction.id)
                    .order_by(Court.name, Court.id)
                    .all()
                )
            ]
    return data


def _page(rows, total: int, page: int, page_size: int, db: Session) -> dict:
    return {
        "items": [
            _read(
                booking,
                court,
                venue,
                db.query(Profile.name).filter(Profile.id == booking.booked_by).scalar(),
                db,
            )
            for booking, court, venue in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def _prepare_booking(
    db: Session,
    profile: Profile,
    match_id: UUID,
    court_ids: list[UUID],
    duration_minutes: int,
    promo_code: str | None,
    *,
    lock: bool,
) -> tuple[Match, Venue, list[Court], datetime, datetime, VenueDiscount | None, dict]:
    match_query = db.query(Match).filter(Match.id == match_id)
    if lock:
        match_query = match_query.with_for_update()
    match = match_query.first()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.created_by != profile.id:
        raise HTTPException(
            status_code=403, detail="Only the host can request a court booking"
        )
    if match.status == MatchStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="This match already has a confirmed booking")
    if match.status != MatchStatus.FULL:
        raise HTTPException(
            status_code=400, detail="A court can only be booked once the match is full"
        )
    active_booking = (
        db.query(Booking.id)
        .filter(
            Booking.match_id == match.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
        .first()
    )
    if active_booking:
        raise HTTPException(
            status_code=400, detail="This match already has an active court booking request"
        )
    if match.court_id is not None and match.court_id not in court_ids:
        raise HTTPException(status_code=400, detail="Include the court selected for this match")
    if (
        match.court_duration_minutes is not None
        and match.court_duration_minutes != duration_minutes
    ):
        raise HTTPException(status_code=400, detail="Use the duration selected for this match")

    start = datetime.combine(match.date, match.time)
    end = start + timedelta(minutes=duration_minutes)
    if start <= local_now_naive():
        raise HTTPException(status_code=400, detail="The match start time has already passed")

    court_query = db.query(Court).filter(Court.id.in_(court_ids)).order_by(Court.id)
    if lock:
        court_query = court_query.with_for_update()
    courts = court_query.all()
    if len(courts) != len(court_ids):
        raise HTTPException(status_code=404, detail="One or more selected courts were not found")
    venue_ids = {court.venue_id for court in courts}
    if len(venue_ids) != 1:
        raise HTTPException(
            status_code=400, detail="All selected courts must belong to the same venue"
        )
    venue = db.query(Venue).filter(Venue.id == courts[0].venue_id).first()
    if venue is None or venue.status != VenueStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Venue not found")

    lines = []
    original_total = Decimal("0.00")
    for court in courts:
        if court.sport.strip().lower() != match.sport.strip().lower():
            raise HTTPException(
                status_code=400,
                detail=f"This court is for {court.sport}, but the match is {match.sport}",
            )
        if not is_open(court.availability, start, end):
            raise HTTPException(status_code=400, detail=f"{court.name} is closed at that time")
        if court.price_per_hour is None or court.price_per_hour <= 0:
            raise HTTPException(
                status_code=400, detail=f"Pricing is not configured for {court.name}"
            )
        clash = (
            db.query(Booking.id)
            .filter(
                Booking.court_id == court.id,
                Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
                Booking.start_time < end,
                Booking.end_time > start,
            )
            .first()
        )
        if clash:
            raise HTTPException(
                status_code=409, detail=f"{court.name} is already reserved at that time"
            )
        line_total = (court.price_per_hour * Decimal(duration_minutes) / Decimal(60)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        original_total += line_total
        lines.append(
            {
                "id": court.id,
                "name": court.name,
                "price_per_hour": court.price_per_hour,
                "line_total": line_total,
            }
        )

    discount = None
    discount_amount = Decimal("0.00")
    normalized_code = promo_code.strip().upper() if promo_code and promo_code.strip() else None
    if normalized_code:
        discount = (
            db.query(VenueDiscount)
            .filter(
                VenueDiscount.venue_id == venue.id,
                func.upper(VenueDiscount.code) == normalized_code,
            )
            .with_for_update()
            .first()
        )
        if discount is None:
            raise HTTPException(status_code=400, detail="Promo code is invalid")
        if not discount.active:
            raise HTTPException(status_code=400, detail="Promo code is inactive")
        if discount.valid_until < local_now_naive().date():
            raise HTTPException(status_code=400, detail="Promo code has expired")
        if discount.usage_limit is not None and discount.usage_count >= discount.usage_limit:
            raise HTTPException(status_code=400, detail="Promo code has reached its usage limit")
        if discount.percent_off is not None:
            discount_amount = (
                original_total * Decimal(discount.percent_off) / Decimal(100)
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        elif discount.amount_off is not None:
            discount_amount = min(Decimal(discount.amount_off), original_total)
        else:
            raise HTTPException(
                status_code=400, detail="Promo code has no valid discount configured"
            )
    quote = {
        "courts": lines,
        "duration_minutes": duration_minutes,
        "original_total": original_total.quantize(Decimal("0.01")),
        "promo_code": normalized_code,
        "discount_amount": discount_amount.quantize(Decimal("0.01")),
        "final_total": (original_total - discount_amount).quantize(Decimal("0.01")),
    }
    return match, venue, courts, start, end, discount, quote


@router.post(
    "/bookings/quote",
    response_model=BookingQuoteRead,
    summary="Validate court availability and calculate booking price",
)
def quote_booking(
    payload: BookingQuoteCreate,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    if len(set(payload.court_ids)) != len(payload.court_ids):
        raise HTTPException(status_code=400, detail="Court selections must be unique")
    *_, quote = _prepare_booking(
        db,
        profile,
        payload.match_id,
        payload.court_ids,
        payload.duration_minutes,
        payload.promo_code,
        lock=False,
    )
    return quote


@router.post(
    "/bookings",
    response_model=BookingRead,
    status_code=201,
    summary="Book one or more courts for a full match",
)
def create_booking(
    payload: BookingCreate,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    court_ids = payload.selected_court_ids
    if len(set(court_ids)) != len(court_ids):
        raise HTTPException(status_code=400, detail="Court selections must be unique")
    match, venue, courts, start, end, discount, quote = _prepare_booking(
        db,
        profile,
        payload.match_id,
        court_ids,
        payload.duration_minutes,
        payload.promo_code,
        lock=True,
    )
    transaction = BookingTransaction(
        id=uuid.uuid4(),
        match_id=match.id,
        booked_by=profile.id,
        promo_discount_id=discount.id if discount else None,
        promo_code=quote["promo_code"],
        duration_minutes=payload.duration_minutes,
        start_time=start,
        end_time=end,
        original_total=quote["original_total"],
        discount_amount=quote["discount_amount"],
        final_total=quote["final_total"],
        status=BookingStatus.PENDING,
    )
    db.add(transaction)
    get_or_create_venue_direct_conversation(db, venue.owner_id, profile.id)
    bookings = []
    for court in courts:
        booking = Booking(
            id=uuid.uuid4(),
            court_id=court.id,
            match_id=match.id,
            booked_by=profile.id,
            start_time=start,
            end_time=end,
            status=BookingStatus.PENDING,
            transaction_id=transaction.id,
            price_per_hour=court.price_per_hour,
        )
        bookings.append(booking)
        db.add(booking)
    if discount:
        discount.usage_count += 1
    if match.court_id is None:
        match.court_id = courts[0].id
        match.court_duration_minutes = payload.duration_minutes
    create_notification(
        db,
        venue.owner_id,
        NotificationType.BOOKING_REQUESTED,
        {
            "match_id": str(match.id),
            "venue_name": venue.name,
            "court_name": ", ".join(court.name for court in courts),
            "start_time": start.isoformat(),
        },
    )
    log_security_event(
        db,
        "COURT_BOOKING_REQUESTED",
        user_id=profile.id,
        request=request,
        details=f"match_id={match.id}; court_ids={','.join(str(court.id) for court in courts)}; start={start.isoformat()}",
    )

    try:
        db.commit()
    except IntegrityError:  # the exclusion / unique constraints caught what the checks missed
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A selected court or this match already has an active booking request",
        )
    db.refresh(bookings[0])
    db.expire(match, ["bookings"])
    result = _read(bookings[0], courts[0], venue, profile.name, db)
    result["selected_court_names"] = [court.name for court in courts]
    return result


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


def _transaction_bookings(db: Session, booking: Booking) -> list[Booking]:
    if booking.transaction_id is None:
        return [booking]
    return (
        db.query(Booking)
        .filter(Booking.transaction_id == booking.transaction_id)
        .order_by(Booking.court_id, Booking.id)
        .with_for_update()
        .all()
    )


@router.post(
    "/bookings/{booking_id}/approve",
    response_model=BookingRead,
    summary="Approve a court booking request",
)
def approve_booking(
    booking_id: UUID,
    request: Request,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    booking, match, court, venue = _booking_for_venue_decision(booking_id, profile, db)
    transaction = booking.transaction
    siblings = _transaction_bookings(db, booking)
    if match is None:
        raise HTTPException(status_code=400, detail="Only match bookings can be approved")
    if match.status != MatchStatus.FULL:
        raise HTTPException(status_code=400, detail="The match is no longer full")
    if any(item.status != BookingStatus.PENDING for item in siblings):
        raise HTTPException(
            status_code=400, detail="All courts in this booking must still be pending"
        )
    if transaction and transaction.status != BookingStatus.PENDING:
        raise HTTPException(status_code=400, detail="This booking transaction is no longer pending")
    if booking.start_time <= local_now_naive():
        raise HTTPException(status_code=400, detail="This booking request has already started")
    sibling_courts = (
        db.query(Court)
        .filter(Court.id.in_([item.court_id for item in siblings]))
        .order_by(Court.id)
        .with_for_update()
        .all()
    )
    sibling_court_by_id = {item.id: item for item in sibling_courts}
    for sibling in siblings:
        sibling_court = sibling_court_by_id.get(sibling.court_id)
        if sibling_court is None or not is_open(
            sibling_court.availability, sibling.start_time, sibling.end_time
        ):
            raise HTTPException(
                status_code=400,
                detail="A court in this request is no longer available at that time",
            )
        clash = (
            db.query(Booking.id)
            .filter(
                Booking.court_id == sibling.court_id,
                Booking.id != sibling.id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.start_time < sibling.end_time,
                Booking.end_time > sibling.start_time,
            )
            .first()
        )
        if clash:
            raise HTTPException(
                status_code=409, detail=f"{sibling_court.name} is already reserved at that time"
            )

    for sibling in siblings:
        sibling.status = BookingStatus.CONFIRMED
    if transaction:
        transaction.status = BookingStatus.CONFIRMED
    match.status = MatchStatus.CONFIRMED
    court_names = ", ".join(sibling_court_by_id[item.court_id].name for item in siblings)
    _add_booking_decision_message(
        db,
        profile,
        match,
        venue,
        court_names,
        booking,
        confirmed=True,
    )
    for user_id in participant_ids(db, match):
        create_notification(
            db,
            user_id,
            NotificationType.BOOKING_CONFIRMED,
            {
                "match_id": str(match.id),
                "venue_name": venue.name,
                "court_name": court_names,
                "start_time": booking.start_time.isoformat(),
                "end_time": booking.end_time.isoformat(),
            },
        )
    log_security_event(
        db,
        "COURT_BOOKING_APPROVED",
        user_id=profile.id,
        request=request,
        details=f"booking_id={booking.id}; transaction_id={booking.transaction_id}; match_id={match.id}",
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This court is already booked at that time")
    db.refresh(booking)
    db.expire(match, ["bookings"])
    booker_name = db.query(Profile.name).filter(Profile.id == booking.booked_by).scalar()
    return _read(booking, court, venue, booker_name, db)


@router.post(
    "/bookings/{booking_id}/reject",
    response_model=BookingRead,
    summary="Reject a court booking request",
)
def reject_booking(
    booking_id: UUID,
    payload: BookingReject,
    request: Request,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    booking, match, court, venue = _booking_for_venue_decision(booking_id, profile, db)
    siblings = _transaction_bookings(db, booking)
    if any(item.status != BookingStatus.PENDING for item in siblings):
        raise HTTPException(
            status_code=400, detail="All courts in this booking must still be pending"
        )
    for sibling in siblings:
        sibling.status = BookingStatus.REJECTED
    if booking.transaction:
        booking.transaction.status = BookingStatus.REJECTED
    if match:
        court_names = (
            ", ".join(
                name
                for (name,) in (
                    db.query(Court.name)
                    .join(Booking, Booking.court_id == Court.id)
                    .filter(Booking.transaction_id == booking.transaction_id)
                    .order_by(Court.name)
                    .all()
                )
            )
            if booking.transaction_id
            else court.name
        )
        _add_booking_decision_message(
            db,
            profile,
            match,
            venue,
            court_names,
            booking,
            confirmed=False,
            reason=payload.reason,
        )
        for user_id in participant_ids(db, match):
            create_notification(
                db,
                user_id,
                NotificationType.BOOKING_REJECTED,
                {
                    "match_id": str(match.id),
                    "venue_name": venue.name,
                    "court_name": court_names,
                    "start_time": booking.start_time.isoformat(),
                    "end_time": booking.end_time.isoformat(),
                    "reason": payload.reason,
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
    return _read(booking, court, venue, booker_name, db)


@router.get(
    "/bookings",
    response_model=PaginatedBookings,
    summary="My bookings (as booker or match participant)",
)
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
    rows = (
        query.order_by(Booking.start_time.desc(), Booking.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return _page(rows, total, page, page_size, db)


@router.post(
    "/bookings/{booking_id}/cancel", response_model=BookingRead, summary="Cancel a booking"
)
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
        raise HTTPException(
            status_code=403, detail="Only the booker or the venue's owner can cancel this booking"
        )

    match = None
    if booking.match_id:  # same lock order as create_booking: match first
        match = db.query(Match).filter(Match.id == booking.match_id).with_for_update().first()
    booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        raise HTTPException(
            status_code=400, detail="Only pending or confirmed bookings can be cancelled"
        )

    was_confirmed = booking.status == BookingStatus.CONFIRMED
    siblings = _transaction_bookings(db, booking)
    for sibling in siblings:
        if sibling.status in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
            sibling.status = BookingStatus.CANCELLED
    if booking.transaction:
        booking.transaction.status = BookingStatus.CANCELLED
    if match is not None and was_confirmed:
        if match.status == MatchStatus.CONFIRMED:
            joined = count_joined_excluding_host(db, match.id)
            match.status = MatchStatus.FULL if joined >= match.players_needed else MatchStatus.OPEN
        for user_id in participant_ids(db, match):
            create_notification(
                db,
                user_id,
                NotificationType.BOOKING_CANCELLED,
                {
                    "match_id": str(match.id),
                    "venue_name": venue.name,
                    "court_name": (
                        ", ".join(
                            name
                            for (name,) in (
                                db.query(Court.name)
                                .join(Booking, Booking.court_id == Court.id)
                                .filter(Booking.transaction_id == booking.transaction_id)
                                .order_by(Court.name)
                                .all()
                            )
                        )
                        if booking.transaction_id
                        else court.name
                    ),
                },
            )
    log_security_event(
        db,
        "BOOKING_CANCELLED",
        user_id=profile.id,
        request=request,
        details=f"booking_id={booking.id}",
    )
    db.commit()
    db.refresh(booking)
    return _read(booking, court, venue, db=db)


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
        query = query.filter(
            Booking.start_time >= day_start, Booking.start_time < day_start + timedelta(days=1)
        )
    total = query.count()
    rows = (
        query.order_by(Booking.start_time, Booking.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return _page(rows, total, page, page_size, db)

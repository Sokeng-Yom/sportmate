from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import exists
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.clock import local_now_naive
from app.core.constants import BookingStatus
from app.core.deps import require_profile_role
from app.db.session import get_db
from app.models.booking import Booking, BookingTransaction
from app.models.profile import Profile
from app.models.venue import Court, Venue
from app.models.venue_review import VenueReview
from app.schemas.venue_review import (
    EligibleVenueReviewRead,
    PaginatedVenueReviews,
    VenueReviewCreate,
    VenueReviewRead,
)

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])


@router.get("/eligible", response_model=list[EligibleVenueReviewRead])
def eligible_reviews(
    profile: Profile = Depends(require_profile_role("PLAYER")),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(BookingTransaction, Venue, Court.name)
        .join(Booking, Booking.transaction_id == BookingTransaction.id)
        .join(Court, Court.id == Booking.court_id)
        .join(Venue, Venue.id == Court.venue_id)
        .filter(
            BookingTransaction.booked_by == profile.id,
            BookingTransaction.status == BookingStatus.CONFIRMED,
            Booking.status == BookingStatus.CONFIRMED,
            BookingTransaction.end_time <= local_now_naive(),
            ~exists().where(VenueReview.booking_transaction_id == BookingTransaction.id),
        )
        .order_by(BookingTransaction.end_time.desc(), Court.name)
        .all()
    )
    eligible: dict[UUID, EligibleVenueReviewRead] = {}
    for transaction, venue, court_name in rows:
        item = eligible.get(transaction.id)
        if item is None:
            eligible[transaction.id] = EligibleVenueReviewRead(
                booking_transaction_id=transaction.id,
                venue_id=venue.id,
                venue_name=venue.name,
                court_names=[court_name],
                start_time=transaction.start_time,
                end_time=transaction.end_time,
            )
        elif court_name not in item.court_names:
            item.court_names.append(court_name)
    return list(eligible.values())


@router.post("", response_model=VenueReviewRead, status_code=201)
def create_review(
    payload: VenueReviewCreate,
    profile: Profile = Depends(require_profile_role("PLAYER")),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(BookingTransaction)
        .filter(BookingTransaction.id == payload.booking_transaction_id)
        .with_for_update()
        .first()
    )
    if transaction is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if transaction.booked_by != profile.id:
        raise HTTPException(status_code=403, detail="You can only review your own bookings")
    if transaction.status != BookingStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be reviewed")
    if transaction.end_time > local_now_naive():
        raise HTTPException(status_code=400, detail="You can review a venue after the booking ends")
    if (
        db.query(VenueReview.id)
        .filter(VenueReview.booking_transaction_id == transaction.id)
        .first()
    ):
        raise HTTPException(status_code=409, detail="You have already reviewed this booking")

    venue_ids = (
        db.query(Venue.id)
        .join(Court, Court.venue_id == Venue.id)
        .join(Booking, Booking.court_id == Court.id)
        .filter(
            Booking.transaction_id == transaction.id,
            Booking.status == BookingStatus.CONFIRMED,
        )
        .distinct()
        .all()
    )
    if len(venue_ids) != 1:
        raise HTTPException(status_code=400, detail="This booking cannot be reviewed")
    venue_id = venue_ids[0][0]
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    review = VenueReview(
        booking_transaction_id=transaction.id,
        venue_id=venue_id,
        player_id=profile.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this booking",
        ) from None
    db.refresh(review)
    return {
        "id": review.id,
        "booking_transaction_id": review.booking_transaction_id,
        "venue_id": review.venue_id,
        "venue_name": venue.name,
        "player_id": profile.id,
        "player_name": profile.name,
        "player_avatar": profile.avatar,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at,
    }


@router.get("/owner", response_model=PaginatedVenueReviews)
def owner_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(VenueReview, Venue.name, Profile.name, Profile.avatar)
        .join(Venue, Venue.id == VenueReview.venue_id)
        .join(Profile, Profile.id == VenueReview.player_id)
    )
    if profile.role != "ADMIN":
        query = query.filter(Venue.owner_id == profile.id)

    total = query.count()
    rows = (
        query.order_by(VenueReview.created_at.desc(), VenueReview.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [
            {
                "id": review.id,
                "booking_transaction_id": review.booking_transaction_id,
                "venue_id": review.venue_id,
                "venue_name": venue_name,
                "player_id": review.player_id,
                "player_name": player_name,
                "player_avatar": player_avatar,
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at,
            }
            for review, venue_name, player_name, player_avatar in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }

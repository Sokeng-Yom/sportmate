import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_profile, require_profile_role
from app.core.enums import VenueStatus
from app.core.search import contains_pattern
from app.core.security import require_role
from app.db.session import get_db
from app.models.profile import Profile
from app.models.venue import Court, Venue
from app.models.venue_marketing import VenueDiscount, VenueEvent
from app.schemas.court import CourtRead
from app.schemas.venue import (
    PaginatedVenueBrowse,
    PaginatedVenues,
    VenueCreate,
    VenueRead,
    VenueUpdate,
)
from app.schemas.venue_marketing import VenueDiscountRead, VenueEventRead
from app.services.venue_access import can_view, get_venue_or_404

router = APIRouter(prefix="/api/v1/venues", tags=["venues"])


# Fixed paths first: "/ping" and "/mine" must be declared before "/{venue_id}".
@router.get(
    "/ping",
    summary="Venue Owner connectivity check",
    description="Returns a simple pong response. Requires the VENUE_OWNER role.",
)
def venues_ping(user: dict = Depends(require_role("VENUE_OWNER"))):
    return {"message": "pong", "role": "VENUE_OWNER"}


@router.get("/mine", response_model=list[VenueRead], summary="List my venues (venue owner)")
def my_venues(
    owner: Profile = Depends(require_profile_role("VENUE_OWNER")),
    db: Session = Depends(get_db),
):
    return (
        db.query(Venue)
        .filter(Venue.owner_id == owner.id)
        .order_by(Venue.created_at.desc(), Venue.id)
        .all()
    )


@router.get("", response_model=PaginatedVenues, summary="Browse approved venues")
def list_venues(
    q: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    query = db.query(Venue).filter(Venue.status == VenueStatus.APPROVED)
    if q and q.strip():
        pattern = contains_pattern(q.strip())
        query = query.filter(
            or_(Venue.name.ilike(pattern, escape="\\"), Venue.address.ilike(pattern, escape="\\"))
        )
    total = query.count()
    items = query.order_by(Venue.name, Venue.id).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/browse", response_model=PaginatedVenueBrowse, summary="Browse venues with courts and marketing")
def browse_venues(
    q: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    query = db.query(Venue).filter(Venue.status == VenueStatus.APPROVED)
    if q and q.strip():
        pattern = contains_pattern(q.strip())
        query = query.filter(
            or_(Venue.name.ilike(pattern, escape="\\"), Venue.address.ilike(pattern, escape="\\"))
        )
    total = query.count()
    venues = query.order_by(Venue.name, Venue.id).offset((page - 1) * page_size).limit(page_size).all()
    venue_ids = [venue.id for venue in venues]
    court_rows = (
        db.query(Court).filter(Court.venue_id.in_(venue_ids)).order_by(Court.name, Court.id).all()
        if venue_ids else []
    )
    discount_rows = (
        db.query(VenueDiscount)
        .filter(VenueDiscount.venue_id.in_(venue_ids))
        .order_by(VenueDiscount.valid_until, VenueDiscount.title, VenueDiscount.id)
        .all()
        if venue_ids else []
    )
    event_rows = (
        db.query(VenueEvent)
        .filter(VenueEvent.venue_id.in_(venue_ids))
        .order_by(VenueEvent.event_date, VenueEvent.event_time, VenueEvent.title, VenueEvent.id)
        .all()
        if venue_ids else []
    )
    courts_by_venue: dict[UUID, list] = {}
    discounts_by_venue: dict[UUID, list] = {}
    events_by_venue: dict[UUID, list] = {}
    for court in court_rows:
        courts_by_venue.setdefault(court.venue_id, []).append(CourtRead.model_validate(court))
    for discount in discount_rows:
        discounts_by_venue.setdefault(discount.venue_id, []).append(VenueDiscountRead.model_validate(discount))
    for event in event_rows:
        events_by_venue.setdefault(event.venue_id, []).append(VenueEventRead.model_validate(event))

    items = []
    for venue in venues:
        items.append({
            **VenueRead.model_validate(venue).model_dump(),
            "courts": courts_by_venue.get(venue.id, []),
            "discounts": discounts_by_venue.get(venue.id, []),
            "events": events_by_venue.get(venue.id, []),
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=VenueRead, status_code=201, summary="Register a venue (starts as PAYMENT_PENDING)")
def create_venue(
    payload: VenueCreate,
    owner: Profile = Depends(require_profile_role("VENUE_OWNER")),
    db: Session = Depends(get_db),
):
    venue = Venue(
        id=uuid.uuid4(),
        owner_id=owner.id,
        name=payload.name,
        address=payload.address,
        description=payload.description,
        status=VenueStatus.PAYMENT_PENDING,
    )
    db.add(venue)
    db.commit()
    db.refresh(venue)
    return venue


@router.get("/{venue_id}", response_model=VenueRead, summary="Get a venue")
def get_venue(
    venue_id: UUID,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    venue = get_venue_or_404(db, venue_id)
    if not can_view(profile, venue):
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue


@router.patch("/{venue_id}", response_model=VenueRead, summary="Update venue information (owner only)")
def update_venue(
    venue_id: UUID,
    payload: VenueUpdate,
    owner: Profile = Depends(require_profile_role("VENUE_OWNER")),
    db: Session = Depends(get_db),
):
    venue = get_venue_or_404(db, venue_id)
    if venue.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="You do not own this venue")
    if venue.status == VenueStatus.REJECTED:
        raise HTTPException(status_code=400, detail="A rejected venue application cannot be edited")

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        if value is None and field in ("name", "address"):
            continue  # required fields cannot be cleared
        setattr(venue, field, value)
    db.commit()
    db.refresh(venue)
    return venue


@router.post(
    "/{venue_id}/confirm-payment",
    response_model=VenueRead,
    summary="Confirm payment (stub) and submit the venue for admin review",
)
def confirm_payment(
    venue_id: UUID,
    owner: Profile = Depends(require_profile_role("VENUE_OWNER")),
    db: Session = Depends(get_db),
):
    # STUB: a real payment provider would call a verified webhook here instead.
    venue = get_venue_or_404(db, venue_id, lock=True)
    if venue.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="You do not own this venue")
    if venue.status != VenueStatus.PAYMENT_PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Payment cannot be confirmed for a venue with status {venue.status}",
        )
    venue.status = VenueStatus.PENDING_REVIEW
    db.commit()
    db.refresh(venue)
    return venue

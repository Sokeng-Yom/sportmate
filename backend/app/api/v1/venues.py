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
from app.models.venue import Venue
from app.schemas.venue import PaginatedVenues, VenueCreate, VenueRead, VenueUpdate
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

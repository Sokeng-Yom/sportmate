import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_profile, require_profile_role
from app.core.enums import VenueStatus
from app.db.session import get_db
from app.models.profile import Profile
from app.models.venue_marketing import VenueDiscount, VenueEvent
from app.schemas.venue_marketing import (
    VenueDiscountCreate,
    VenueDiscountRead,
    VenueDiscountUpdate,
    VenueEventCreate,
    VenueEventRead,
    VenueEventUpdate,
)
from app.services.venue_access import can_manage, can_view, get_venue_or_404

router = APIRouter(prefix="/api/v1/venues", tags=["venue marketing"])


def _visible_venue(db: Session, venue_id: UUID, profile: Profile):
    venue = get_venue_or_404(db, venue_id)
    if not can_view(profile, venue):
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue


def _manageable_venue(db: Session, venue_id: UUID, profile: Profile):
    venue = get_venue_or_404(db, venue_id)
    if not can_manage(profile, venue):
        raise HTTPException(status_code=403, detail="You do not manage this venue")
    if venue.status != VenueStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Offers and events require an approved venue")
    return venue


@router.get("/{venue_id}/discounts", response_model=list[VenueDiscountRead])
def list_venue_discounts(
    venue_id: UUID,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    _visible_venue(db, venue_id, profile)
    return (
        db.query(VenueDiscount)
        .filter(VenueDiscount.venue_id == venue_id)
        .order_by(VenueDiscount.valid_until, VenueDiscount.title, VenueDiscount.id)
        .all()
    )


@router.post("/{venue_id}/discounts", response_model=VenueDiscountRead, status_code=201)
def create_venue_discount(
    venue_id: UUID,
    payload: VenueDiscountCreate,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    venue = _manageable_venue(db, venue_id, profile)
    discount = VenueDiscount(id=uuid.uuid4(), venue_id=venue.id, **payload.model_dump())
    db.add(discount)
    db.commit()
    db.refresh(discount)
    return discount


@router.patch("/{venue_id}/discounts/{discount_id}", response_model=VenueDiscountRead)
def update_venue_discount(
    venue_id: UUID,
    discount_id: UUID,
    payload: VenueDiscountUpdate,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    _manageable_venue(db, venue_id, profile)
    discount = (
        db.query(VenueDiscount)
        .filter(VenueDiscount.id == discount_id, VenueDiscount.venue_id == venue_id)
        .first()
    )
    if discount is None:
        raise HTTPException(status_code=404, detail="Discount not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(discount, field, value)
    db.commit()
    db.refresh(discount)
    return discount


@router.delete("/{venue_id}/discounts/{discount_id}", status_code=204)
def delete_venue_discount(
    venue_id: UUID,
    discount_id: UUID,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    _manageable_venue(db, venue_id, profile)
    discount = (
        db.query(VenueDiscount)
        .filter(VenueDiscount.id == discount_id, VenueDiscount.venue_id == venue_id)
        .first()
    )
    if discount is None:
        raise HTTPException(status_code=404, detail="Discount not found")
    db.delete(discount)
    db.commit()


@router.get("/{venue_id}/events", response_model=list[VenueEventRead])
def list_venue_events(
    venue_id: UUID,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    _visible_venue(db, venue_id, profile)
    return (
        db.query(VenueEvent)
        .filter(VenueEvent.venue_id == venue_id)
        .order_by(VenueEvent.event_date, VenueEvent.event_time, VenueEvent.title, VenueEvent.id)
        .all()
    )


@router.post("/{venue_id}/events", response_model=VenueEventRead, status_code=201)
def create_venue_event(
    venue_id: UUID,
    payload: VenueEventCreate,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    venue = _manageable_venue(db, venue_id, profile)
    event = VenueEvent(id=uuid.uuid4(), venue_id=venue.id, **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/{venue_id}/events/{event_id}", response_model=VenueEventRead)
def update_venue_event(
    venue_id: UUID,
    event_id: UUID,
    payload: VenueEventUpdate,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    _manageable_venue(db, venue_id, profile)
    event = (
        db.query(VenueEvent)
        .filter(VenueEvent.id == event_id, VenueEvent.venue_id == venue_id)
        .first()
    )
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{venue_id}/events/{event_id}", status_code=204)
def delete_venue_event(
    venue_id: UUID,
    event_id: UUID,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    _manageable_venue(db, venue_id, profile)
    event = (
        db.query(VenueEvent)
        .filter(VenueEvent.id == event_id, VenueEvent.venue_id == venue_id)
        .first()
    )
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()

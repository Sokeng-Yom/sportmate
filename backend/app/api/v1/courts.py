import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_profile, require_profile_role
from app.core.enums import VenueStatus
from app.db.session import get_db
from app.models.profile import Profile
from app.models.venue import Court, Venue
from app.schemas.court import CourtCreate, CourtRead, CourtUpdate
from app.services.venue_access import can_manage, can_view, get_venue_or_404

router = APIRouter(prefix="/api/v1", tags=["courts"])

DUPLICATE_NAME = "A court with this name already exists in this venue"


def _require_manageable_approved_venue(db: Session, profile: Profile, venue_id: UUID) -> Venue:
    venue = get_venue_or_404(db, venue_id)
    if not can_manage(profile, venue):
        raise HTTPException(status_code=403, detail="You do not manage this venue")
    if venue.status != VenueStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Courts can only be managed for approved venues")
    return venue


@router.post(
    "/venues/{venue_id}/courts",
    response_model=CourtRead,
    status_code=201,
    summary="Add a court to an approved venue (owner or admin)",
)
def create_court(
    venue_id: UUID,
    payload: CourtCreate,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    venue = _require_manageable_approved_venue(db, profile, venue_id)
    court = Court(
        id=uuid.uuid4(),
        venue_id=venue.id,
        name=payload.name,
        sport=payload.sport,
        availability=payload.availability.model_dump(mode="json") if payload.availability else None,
    )
    db.add(court)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=DUPLICATE_NAME)
    db.refresh(court)
    return court


@router.get("/venues/{venue_id}/courts", response_model=list[CourtRead], summary="List a venue's courts")
def list_courts(
    venue_id: UUID,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    venue = get_venue_or_404(db, venue_id)
    if not can_view(profile, venue):
        raise HTTPException(status_code=404, detail="Venue not found")
    return db.query(Court).filter(Court.venue_id == venue_id).order_by(Court.name, Court.id).all()


@router.get("/courts/{court_id}", response_model=CourtRead, summary="Get a court")
def get_court(
    court_id: UUID,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    court = db.query(Court).filter(Court.id == court_id).first()
    if court is None:
        raise HTTPException(status_code=404, detail="Court not found")
    if not can_view(profile, get_venue_or_404(db, court.venue_id)):
        raise HTTPException(status_code=404, detail="Court not found")
    return court


@router.patch(
    "/courts/{court_id}",
    response_model=CourtRead,
    summary="Update a court or its weekly availability (owner or admin)",
)
def update_court(
    court_id: UUID,
    payload: CourtUpdate,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    court = db.query(Court).filter(Court.id == court_id).with_for_update().first()
    if court is None:
        raise HTTPException(status_code=404, detail="Court not found")
    _require_manageable_approved_venue(db, profile, court.venue_id)

    if payload.name is not None:
        court.name = payload.name
    if payload.sport is not None:
        court.sport = payload.sport
    if "availability" in payload.model_fields_set:
        court.availability = payload.availability.model_dump(mode="json") if payload.availability else None

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=DUPLICATE_NAME)
    db.refresh(court)
    return court

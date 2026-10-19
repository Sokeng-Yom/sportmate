from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.enums import VenueStatus
from app.models.profile import Profile
from app.models.venue import Venue


def get_venue_or_404(db: Session, venue_id: UUID, *, lock: bool = False) -> Venue:
    query = db.query(Venue).filter(Venue.id == venue_id)
    if lock:
        query = query.with_for_update()
    venue = query.first()
    if venue is None:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue


def can_manage(profile: Profile, venue: Venue) -> bool:
    """The owning venue owner, or an admin."""
    return profile.role == "ADMIN" or (profile.role == "VENUE_OWNER" and venue.owner_id == profile.id)


def can_view(profile: Profile, venue: Venue) -> bool:
    """Approved venues are public; everything else is visible to the owner and admins only."""
    return venue.status == VenueStatus.APPROVED or can_manage(profile, venue)

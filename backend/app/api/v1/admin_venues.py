from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.clock import utc_now_naive
from app.core.constants import NotificationType
from app.core.deps import require_profile_role
from app.core.enums import VenueStatus
from app.db.session import get_db
from app.models.profile import Profile
from app.models.venue import Venue
from app.schemas.venue import PaginatedVenues, VenueRead, VenueRejection
from app.services.notifications import create_notification
from app.services.security_log import log_security_event
from app.services.venue_access import get_venue_or_404

router = APIRouter(prefix="/api/v1/admin/venues", tags=["admin"])

StatusFilter = Literal["PAYMENT_PENDING", "PENDING_REVIEW", "APPROVED", "REJECTED"]


def _venue_in_review(db: Session, venue_id: UUID) -> Venue:
    venue = get_venue_or_404(db, venue_id, lock=True)
    if venue.status != VenueStatus.PENDING_REVIEW:
        raise HTTPException(
            status_code=400,
            detail=f"Only venues in PENDING_REVIEW can be approved or rejected (current status: {venue.status})",
        )
    return venue


@router.get("", response_model=PaginatedVenues, summary="List venue applications")
def list_venue_applications(
    status: StatusFilter | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    query = db.query(Venue)
    if status:
        query = query.filter(Venue.status == status)
    total = query.count()
    items = (
        query.order_by(Venue.created_at, Venue.id)  # oldest application first
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/{venue_id}/approve", response_model=VenueRead, summary="Approve a venue application")
def approve_venue(
    venue_id: UUID,
    request: Request,
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    venue = _venue_in_review(db, venue_id)
    venue.status = VenueStatus.APPROVED
    venue.rejection_reason = None
    venue.reviewed_at = utc_now_naive()
    create_notification(
        db, venue.owner_id, NotificationType.VENUE_APPROVED,
        {"venue_id": str(venue.id), "venue_name": venue.name},
    )
    log_security_event(db, "VENUE_APPROVED", user_id=admin.id, request=request, details=f"venue_id={venue.id}")
    db.commit()
    db.refresh(venue)
    return venue


@router.post("/{venue_id}/reject", response_model=VenueRead, summary="Reject a venue application")
def reject_venue(
    venue_id: UUID,
    payload: VenueRejection,
    request: Request,
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    venue = _venue_in_review(db, venue_id)
    venue.status = VenueStatus.REJECTED
    venue.rejection_reason = payload.reason
    venue.reviewed_at = utc_now_naive()
    create_notification(
        db, venue.owner_id, NotificationType.VENUE_REJECTED,
        {"venue_id": str(venue.id), "venue_name": venue.name, "reason": payload.reason},
    )
    log_security_event(db, "VENUE_REJECTED", user_id=admin.id, request=request, details=f"venue_id={venue.id}")
    db.commit()
    db.refresh(venue)
    return venue

import logging
from typing import Literal
from uuid import UUID
from urllib.parse import quote, urljoin

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.clock import utc_now_naive
from app.core.config import settings
from app.core.constants import NotificationType
from app.core.deps import require_profile_role
from app.core.enums import VenueStatus
from app.db.session import get_db
from app.models.profile import Profile
from app.models.venue import Venue
from app.schemas.venue import (
    PaginatedVenues,
    VenuePaymentProofUrl,
    VenueRead,
    VenueRejection,
)
from app.services.notifications import create_notification
from app.services.security_log import log_security_event
from app.services.venue_access import get_venue_or_404

router = APIRouter(prefix="/api/v1/admin/venues", tags=["admin"])
logger = logging.getLogger(__name__)

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


@router.get(
    "/{venue_id}/payment-proof-url",
    response_model=VenuePaymentProofUrl,
    summary="Create a short-lived URL for an uploaded venue payment proof",
)
def get_payment_proof_url(
    venue_id: UUID,
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    venue = get_venue_or_404(db, venue_id)
    if not venue.payment_proof_path:
        raise HTTPException(status_code=404, detail="No payment proof was submitted")
    if not venue.payment_proof_path.startswith(f"{venue.id}/"):
        logger.error("Invalid payment proof path for venue %s", venue.id)
        raise HTTPException(status_code=500, detail="Payment proof path is invalid")

    encoded_path = quote(venue.payment_proof_path, safe="/")
    storage_url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/sign/"
        f"venue-payment-proofs/{encoded_path}"
    )
    try:
        response = httpx.post(
            storage_url,
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            json={"expiresIn": 300},
            timeout=15,
        )
    except httpx.HTTPError:
        logger.exception("Could not request signed payment proof URL for venue %s", venue.id)
        raise HTTPException(
            status_code=502,
            detail="Could not create a secure link for the payment proof",
        ) from None

    if not response.is_success:
        logger.error(
            "Storage returned HTTP %s when signing payment proof for venue %s",
            response.status_code,
            venue.id,
        )
        raise HTTPException(
            status_code=502,
            detail="Could not create a secure link for the payment proof",
        )

    try:
        signed_url = response.json()["signedURL"]
    except (ValueError, KeyError, TypeError):
        logger.error("Storage returned an invalid signed URL for venue %s", venue.id)
        raise HTTPException(
            status_code=502,
            detail="Could not create a secure link for the payment proof",
        ) from None

    if not isinstance(signed_url, str) or not signed_url:
        logger.error("Storage returned an empty signed URL for venue %s", venue.id)
        raise HTTPException(
            status_code=502,
            detail="Could not create a secure link for the payment proof",
        )

    if signed_url.startswith("/"):
        signed_url = f"{settings.supabase_url.rstrip('/')}/storage/v1{signed_url}"
    elif not signed_url.startswith(("https://", "http://")):
        signed_url = urljoin(f"{settings.supabase_url.rstrip('/')}/storage/v1/", signed_url)
    return {"signed_url": signed_url}


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

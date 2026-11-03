from datetime import timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import String, cast, column, func, or_, table
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Session

from app.core.clock import utc_now
from app.core.constants import NotificationType
from app.core.deps import require_profile_role
from app.core.search import contains_pattern
from app.db.session import get_db
from app.models.booking import Booking
from app.models.profile import Profile
from app.models.system import SecurityLog
from app.models.venue import Court, Venue
from app.schemas.admin import AdminUserRead, PaginatedAdminUsers, PaginatedSecurityLogs, RestrictUser
from app.schemas.booking import BookingRead, PaginatedBookings
from app.schemas.court import CourtRead, PaginatedCourtSearch
from app.services.notifications import create_notification
from app.services.security_log import log_security_event

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# Lightweight handle on Supabase's auth.users (read-only; not part of our migrations).
auth_users = table("users", column("id", PG_UUID(as_uuid=True)), column("email", String), schema="auth")


def _user_dict(profile: Profile, email: str | None) -> dict:
    until = profile.restricted_until
    return {
        "id": profile.id,
        "name": profile.name or "",
        "email": email,
        "role": profile.role,
        "avatar": profile.avatar,
        "restricted_until": until,
        "restricted": bool(until and until > utc_now()),
        "created_at": profile.created_at,
    }


def _email(db: Session, user_id) -> str | None:
    return db.query(auth_users.c.email).filter(auth_users.c.id == user_id).scalar()


def _target(db: Session, user_id: UUID) -> Profile:
    profile = db.query(Profile).filter(Profile.id == user_id).with_for_update().first()
    if profile is None:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.get("/users", response_model=PaginatedAdminUsers, summary="Search and filter user accounts")
def list_users(
    q: str | None = Query(None, max_length=100),
    role: Literal["PLAYER", "VENUE_OWNER", "ADMIN"] | None = None,
    restricted: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    query = db.query(Profile, auth_users.c.email).join(auth_users, auth_users.c.id == Profile.id)
    if role:
        query = query.filter(Profile.role == role)
    if q and q.strip():
        pattern = contains_pattern(q.strip())
        query = query.filter(
            or_(Profile.name.ilike(pattern, escape="\\"), auth_users.c.email.ilike(pattern, escape="\\"))
        )
    now = utc_now()
    if restricted is True:
        query = query.filter(Profile.restricted_until > now)
    elif restricted is False:
        query = query.filter(or_(Profile.restricted_until.is_(None), Profile.restricted_until <= now))

    total = query.count()
    rows = (
        query.order_by(Profile.created_at.desc(), Profile.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"items": [_user_dict(p, email) for p, email in rows], "total": total, "page": page, "page_size": page_size}


@router.post("/users/{user_id}/restrict", response_model=AdminUserRead, summary="Restrict a user from joining matches")
def restrict_user(
    user_id: UUID,
    payload: RestrictUser,
    request: Request,
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    target = _target(db, user_id)
    if target.role == "ADMIN":
        raise HTTPException(status_code=400, detail="Administrators cannot be restricted")

    until = utc_now() + timedelta(days=payload.days)
    target.restricted_until = until
    create_notification(
        db, target.id, NotificationType.ACCOUNT_RESTRICTED,
        {"until": until.isoformat(), "reason": payload.reason},
    )
    log_security_event(
        db, "USER_RESTRICTED", user_id=admin.id, request=request,
        details=f"target={target.id}; days={payload.days}; reason={payload.reason}",
    )
    db.commit()
    db.refresh(target)
    return _user_dict(target, _email(db, target.id))


@router.post("/users/{user_id}/unrestrict", response_model=AdminUserRead, summary="Lift a restriction")
def unrestrict_user(
    user_id: UUID,
    request: Request,
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    target = _target(db, user_id)
    target.restricted_until = None
    log_security_event(db, "USER_UNRESTRICTED", user_id=admin.id, request=request, details=f"target={target.id}")
    db.commit()
    db.refresh(target)
    return _user_dict(target, _email(db, target.id))


@router.get("/security-logs", response_model=PaginatedSecurityLogs, summary="Audit trail and suspicious activity, newest first")
def security_logs(
    action: str | None = Query(None, max_length=60),
    user_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    query = db.query(SecurityLog, Profile.name).outerjoin(Profile, Profile.id == SecurityLog.user_id)
    if action:
        query = query.filter(SecurityLog.action == action)
    if user_id:
        query = query.filter(SecurityLog.user_id == user_id)

    total = query.count()
    rows = (
        query.order_by(SecurityLog.created_at.desc(), SecurityLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        {
            "id": log.id, "user_id": log.user_id, "user_name": name, "action": log.action,
            "ip_address": log.ip_address, "details": log.details, "created_at": log.created_at,
        }
        for log, name in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/bookings", response_model=PaginatedBookings, summary="List and filter all bookings (admin)")
def list_admin_bookings(
    q: str | None = Query(None, max_length=100),
    status: str | None = None,
    venue_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Booking, Court, Venue, Profile)
        .join(Court, Court.id == Booking.court_id)
        .join(Venue, Venue.id == Court.venue_id)
        .outerjoin(Profile, Profile.id == Booking.booked_by)
    )

    if status and status.strip():
        query = query.filter(Booking.status == status.strip().upper())

    if venue_id:
        query = query.filter(Venue.id == venue_id)

    if q and q.strip():
        pattern = contains_pattern(q.strip())
        query = query.filter(
            or_(
                Court.name.ilike(pattern, escape="\\"),
                Venue.name.ilike(pattern, escape="\\"),
                Profile.name.ilike(pattern, escape="\\"),
                cast(Booking.id, String).ilike(pattern, escape="\\"),
            )
        )

    total = query.count()
    rows = (
        query.order_by(Booking.start_time.desc(), Booking.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            **BookingRead.model_validate(b).model_dump(),
            "court_name": c.name,
            "venue_id": v.id,
            "venue_name": v.name,
            "booker_name": p.name if p else None,
        }
        for b, c, v, p in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/courts", response_model=PaginatedCourtSearch, summary="List and filter all courts (admin)")
def list_admin_courts(
    q: str | None = Query(None, max_length=100),
    sport: str | None = Query(None, max_length=50),
    venue_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Court, Venue)
        .join(Venue, Venue.id == Court.venue_id)
    )

    if sport and sport.strip():
        query = query.filter(func.lower(Court.sport) == sport.strip().lower())

    if venue_id:
        query = query.filter(Court.venue_id == venue_id)

    if q and q.strip():
        pattern = contains_pattern(q.strip())
        query = query.filter(
            or_(
                Court.name.ilike(pattern, escape="\\"),
                Venue.name.ilike(pattern, escape="\\"),
                Venue.address.ilike(pattern, escape="\\"),
                Court.sport.ilike(pattern, escape="\\"),
            )
        )

    total = query.count()
    rows = (
        query.order_by(Venue.name.asc(), Court.name.asc(), Court.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            **CourtRead.model_validate(c).model_dump(),
            "venue_name": v.name,
            "venue_address": v.address,
        }
        for c, v in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


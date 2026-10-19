import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.clock import utc_now_naive
from app.core.deps import get_current_profile
from app.db.session import get_db
from app.models.profile import Profile
from app.models.system import Notification
from app.schemas.notification import MarkedCount, NotificationPage, NotificationRead

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


def _read(n: Notification) -> dict:
    return {
        "id": n.id,
        "type": n.type,
        "payload": json.loads(n.payload) if n.payload else None,
        "read": n.read_at is not None,
        "created_at": n.created_at,
    }


@router.get("", response_model=NotificationPage, summary="My notifications, newest first (with unread count)")
def list_notifications(
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    mine = db.query(Notification).filter(Notification.user_id == profile.id)
    unread_count = mine.filter(Notification.read_at.is_(None)).count()
    query = mine.filter(Notification.read_at.is_(None)) if unread_only else mine
    total = query.count()
    rows = (
        query.order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [_read(n) for n in rows],
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
    }


@router.post("/read-all", response_model=MarkedCount, summary="Mark all my notifications as read")
def mark_all_read(profile: Profile = Depends(get_current_profile), db: Session = Depends(get_db)):
    marked = (
        db.query(Notification)
        .filter(Notification.user_id == profile.id, Notification.read_at.is_(None))
        .update({"read_at": utc_now_naive()}, synchronize_session=False)
    )
    db.commit()
    return {"marked": marked}


@router.post("/{notification_id}/read", response_model=NotificationRead, summary="Mark one notification as read")
def mark_read(notification_id: UUID, profile: Profile = Depends(get_current_profile), db: Session = Depends(get_db)):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == profile.id)
        .first()
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.read_at is None:
        notification.read_at = utc_now_naive()
        db.commit()
        db.refresh(notification)
    return _read(notification)

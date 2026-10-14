from uuid import UUID

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.system import SecurityLog


def log_security_event(
    db: Session,
    action: str,
    *,
    user_id: UUID | None = None,
    request: Request | None = None,
    details: str | None = None,
) -> None:
    """Adds an audit row to the current transaction (the caller commits)."""
    ip_address = request.client.host if request is not None and request.client else None
    db.add(SecurityLog(user_id=user_id, action=action, ip_address=ip_address, details=details))

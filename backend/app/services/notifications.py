import json
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.system import Notification


def create_notification(db: Session, user_id: UUID, type_: str, payload: dict | None = None) -> None:
    """Adds an in-app notification to the current transaction (the caller commits)."""
    db.add(
        Notification(
            user_id=user_id,
            type=type_,
            payload=json.dumps(payload) if payload else None,
        )
    )

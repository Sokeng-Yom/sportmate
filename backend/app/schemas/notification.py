from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.clock import UtcDateTime


class NotificationRead(BaseModel):
    id: UUID
    type: str
    payload: dict | None = None
    read: bool
    created_at: UtcDateTime


class NotificationPage(BaseModel):
    items: list[NotificationRead]
    total: int
    unread_count: int
    page: int
    page_size: int


class MarkedCount(BaseModel):
    marked: int

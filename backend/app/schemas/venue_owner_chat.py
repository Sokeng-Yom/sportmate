from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.chat import MessageRead


class VenueOwnerConversationRead(BaseModel):
    conversation_id: UUID
    created_at: datetime
    owner_id: UUID
    owner_name: str
    owner_avatar: str | None = None
    host_id: UUID
    host_name: str
    host_avatar: str | None = None
    venue_names: list[str]
    court_names: list[str]
    last_message: MessageRead | None = None
    unread_count: int


class VenueOwnerConversationPage(BaseModel):
    items: list[VenueOwnerConversationRead]

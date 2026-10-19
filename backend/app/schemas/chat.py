from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints

MessageContent = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


class MessageCreate(BaseModel):
    content: MessageContent


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    sender_id: UUID
    sender_name: str = ""
    content: str
    created_at: datetime


class ChatMember(BaseModel):
    user_id: UUID
    name: str
    avatar: str | None = None
    is_creator: bool


class ChatInfo(BaseModel):
    conversation_id: UUID
    match_id: UUID
    members: list[ChatMember]


class MessagePage(BaseModel):
    conversation_id: UUID
    items: list[MessageRead]  # oldest first, ready to render
    has_more: bool  # older messages exist: call again with before=<created_at of items[0]>

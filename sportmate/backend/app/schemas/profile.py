from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    role: str
    avatar: str | None = None
    restricted_until: datetime | None = None
    last_seen_at: datetime | None = None
    created_at: datetime


class ProfileUpdate(BaseModel):
    name: str | None = None
    avatar: str | None = None
from datetime import datetime
from uuid import UUID
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

ProfileName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
AvatarUrl = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


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
    name: ProfileName | None = None
    avatar: AvatarUrl | None = None
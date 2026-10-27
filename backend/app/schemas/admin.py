from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints


class RestrictUser(BaseModel):
    days: int = Field(ge=1, le=365)
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]


class AdminUserRead(BaseModel):
    id: UUID
    name: str
    email: str | None = None
    role: str
    avatar: str | None = None
    restricted_until: datetime | None = None
    restricted: bool
    created_at: datetime | None = None


class PaginatedAdminUsers(BaseModel):
    items: list[AdminUserRead]
    total: int
    page: int
    page_size: int


class SecurityLogRead(BaseModel):
    id: UUID
    user_id: UUID | None = None
    user_name: str | None = None
    action: str
    ip_address: str | None = None
    details: str | None = None
    created_at: datetime | None = None


class PaginatedSecurityLogs(BaseModel):
    items: list[SecurityLogRead]
    total: int
    page: int
    page_size: int

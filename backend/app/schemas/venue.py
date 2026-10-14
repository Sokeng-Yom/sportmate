from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Address = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]
PhotoUrl = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Reason = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class VenueCreate(BaseModel):
    name: Name
    address: Address
    description: Description | None = None


class VenueUpdate(BaseModel):
    name: Name | None = None
    address: Address | None = None
    description: Description | None = None
    photo_url: PhotoUrl | None = None


class VenueRejection(BaseModel):
    reason: Reason


class VenueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    name: str
    address: str
    description: str | None = None
    photo_url: str | None = None
    status: str
    rejection_reason: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


class PaginatedVenues(BaseModel):
    items: list[VenueRead]
    total: int
    page: int
    page_size: int

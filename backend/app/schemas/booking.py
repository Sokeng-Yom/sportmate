from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BookingCreate(BaseModel):
    match_id: UUID
    court_id: UUID
    duration_minutes: int = Field(60, ge=30, le=240)


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    court_id: UUID
    match_id: UUID | None = None
    booked_by: UUID
    start_time: datetime
    end_time: datetime
    status: str
    created_at: datetime
    booker_name: str | None = None
    court_name: str | None = None
    venue_id: UUID | None = None
    venue_name: str | None = None


class PaginatedBookings(BaseModel):
    items: list[BookingRead]
    total: int
    page: int
    page_size: int

from datetime import date, datetime, time
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
Code = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Sport = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
PriceLabel = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class VenueDiscountCreate(BaseModel):
    title: Title
    description: Description
    percent_off: int | None = Field(default=None, ge=1, le=100)
    code: Code | None = None
    valid_until: date


class VenueDiscountUpdate(BaseModel):
    title: Title | None = None
    description: Description | None = None
    percent_off: int | None = Field(default=None, ge=1, le=100)
    code: Code | None = None
    valid_until: date | None = None


class VenueDiscountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    venue_id: UUID
    title: str
    description: str
    percent_off: int | None
    code: str | None
    valid_until: date
    created_at: datetime


class VenueEventCreate(BaseModel):
    title: Title
    description: Description
    event_date: date
    event_time: time
    sport: Sport
    price_label: PriceLabel


class VenueEventUpdate(BaseModel):
    title: Title | None = None
    description: Description | None = None
    event_date: date | None = None
    event_time: time | None = None
    sport: Sport | None = None
    price_label: PriceLabel | None = None


class VenueEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    venue_id: UUID
    title: str
    description: str
    event_date: date
    event_time: time
    sport: str
    price_label: str
    created_at: datetime

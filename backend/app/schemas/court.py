from datetime import datetime, time
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.services.court_availability import DAY_KEYS

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Sport = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class TimeWindow(BaseModel):
    start: time
    end: time


class WeeklyAvailability(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mon: list[TimeWindow] = []
    tue: list[TimeWindow] = []
    wed: list[TimeWindow] = []
    thu: list[TimeWindow] = []
    fri: list[TimeWindow] = []
    sat: list[TimeWindow] = []
    sun: list[TimeWindow] = []

    @model_validator(mode="after")
    def validate_windows(self):
        for day in DAY_KEYS:
            windows = sorted(getattr(self, day), key=lambda w: w.start)
            for window in windows:
                if window.start >= window.end:
                    raise ValueError(f"{day}: a window must start before it ends")
            for earlier, later in zip(windows, windows[1:]):
                if later.start < earlier.end:
                    raise ValueError(f"{day}: time windows overlap")
        return self


class CourtCreate(BaseModel):
    name: Name
    sport: Sport
    price_per_hour: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    availability: WeeklyAvailability | None = None


class CourtUpdate(BaseModel):
    name: Name | None = None
    sport: Sport | None = None
    price_per_hour: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    availability: WeeklyAvailability | None = None


class CourtRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    venue_id: UUID
    name: str
    sport: str
    price_per_hour: Decimal | None = None
    availability: WeeklyAvailability | None = None
    created_at: datetime


class CourtSearchItem(CourtRead):
    venue_name: str
    venue_address: str


class PaginatedCourtSearch(BaseModel):
    items: list[CourtSearchItem]
    total: int
    page: int
    page_size: int

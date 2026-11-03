from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BookingReject(BaseModel):
    reason: str = Field(min_length=1, max_length=500)

    @model_validator(mode="before")
    @classmethod
    def strip_reason(cls, value):
        if isinstance(value, dict) and isinstance(value.get("reason"), str):
            value = {**value, "reason": value["reason"].strip()}
        return value

from app.core.clock import UtcDateTime


class BookingCreate(BaseModel):
    match_id: UUID
    court_id: UUID | None = None
    court_ids: list[UUID] | None = Field(default=None, min_length=1, max_length=10)
    duration_minutes: int = Field(60, ge=30, le=240)
    promo_code: str | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_courts(self):
        if not self.court_ids and self.court_id is None:
            raise ValueError("Select at least one court")
        if self.court_ids and len(set(self.court_ids)) != len(self.court_ids):
            raise ValueError("Court selections must be unique")
        if self.court_id is not None and self.court_ids and self.court_id not in self.court_ids:
            raise ValueError("court_id must be included in court_ids")
        return self

    @property
    def selected_court_ids(self) -> list[UUID]:
        if self.court_ids:
            return self.court_ids
        return [self.court_id] if self.court_id is not None else []


class BookingQuoteCreate(BaseModel):
    match_id: UUID
    court_ids: list[UUID] = Field(min_length=1, max_length=10)
    duration_minutes: int = Field(60, ge=30, le=240)
    promo_code: str | None = Field(default=None, max_length=50)


class BookingQuoteCourt(BaseModel):
    id: UUID
    name: str
    price_per_hour: Decimal
    line_total: Decimal


class BookingQuoteRead(BaseModel):
    courts: list[BookingQuoteCourt]
    duration_minutes: int
    original_total: Decimal
    promo_code: str | None
    discount_amount: Decimal
    final_total: Decimal


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    court_id: UUID
    match_id: UUID | None = None
    booked_by: UUID
    start_time: datetime
    end_time: datetime
    status: str
    created_at: UtcDateTime
    booker_name: str | None = None
    court_name: str | None = None
    venue_id: UUID | None = None
    venue_name: str | None = None
    transaction_id: UUID | None = None
    selected_court_names: list[str] | None = None
    price_per_hour: Decimal | None = None
    line_total: Decimal | None = None
    original_total: Decimal | None = None
    discount_amount: Decimal | None = None
    final_total: Decimal | None = None
    promo_code: str | None = None


class PaginatedBookings(BaseModel):
    items: list[BookingRead]
    total: int
    page: int
    page_size: int

from datetime import date, datetime, time
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.core.clock import UtcDateTime

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Description = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
]
Code = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Sport = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
PriceLabel = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class VenueDiscountCreate(BaseModel):
    title: Title
    description: Description
    percent_off: int | None = Field(default=None, ge=1, le=100)
    amount_off: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    code: Code | None = None
    valid_until: date
    active: bool = True
    usage_limit: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_promo(self):
        if self.code and (self.percent_off is None) == (self.amount_off is None):
            raise ValueError("A promo code needs exactly one percentage or fixed-amount discount")
        if self.percent_off is not None and self.amount_off is not None:
            raise ValueError("Choose either a percentage or fixed-amount discount")
        return self


class VenueDiscountUpdate(BaseModel):
    title: Title | None = None
    description: Description | None = None
    percent_off: int | None = Field(default=None, ge=1, le=100)
    amount_off: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    code: Code | None = None
    valid_until: date | None = None
    active: bool | None = None
    usage_limit: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_discount(self):
        if self.percent_off is not None and self.amount_off is not None:
            raise ValueError("Choose either a percentage or fixed-amount discount")
        return self


class VenueDiscountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    venue_id: UUID
    title: str
    description: str
    percent_off: int | None
    amount_off: Decimal | None = None
    code: str | None
    valid_until: date
    active: bool = True
    usage_limit: int | None = None
    usage_count: int = 0
    created_at: UtcDateTime


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
    created_at: UtcDateTime

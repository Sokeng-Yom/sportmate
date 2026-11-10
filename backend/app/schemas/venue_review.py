from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.clock import UtcDateTime


class VenueReviewCreate(BaseModel):
    booking_transaction_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def strip_comment(self):
        if self.comment is not None:
            self.comment = self.comment.strip() or None
        return self


class EligibleVenueReviewRead(BaseModel):
    booking_transaction_id: UUID
    venue_id: UUID
    venue_name: str
    court_names: list[str]
    start_time: datetime
    end_time: datetime


class VenueReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    booking_transaction_id: UUID
    venue_id: UUID
    venue_name: str
    player_id: UUID
    player_name: str
    player_avatar: str | None = None
    rating: int
    comment: str | None = None
    created_at: UtcDateTime


class PaginatedVenueReviews(BaseModel):
    items: list[VenueReviewRead]
    total: int
    page: int
    page_size: int

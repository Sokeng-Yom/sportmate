from datetime import date as date_type
from datetime import datetime
from datetime import time as time_type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.enums import SkillLevel


class MatchCreate(BaseModel):
    sport: str
    location: str
    date: date_type
    time: time_type
    players_needed: int = Field(description="Number of additional players needed, excluding the host")
    skill_level: str
    court_id: UUID | None = None
    court_duration_minutes: int | None = Field(default=None, ge=30, le=240)

    @model_validator(mode="after")
    def validate_court_selection(self):
        if (self.court_id is None) != (self.court_duration_minutes is None):
            raise ValueError("court_id and court_duration_minutes must be provided together")
        return self

    @field_validator("players_needed")
    @classmethod
    def validate_players_needed(cls, v: int) -> int:
        if v < 1:
            raise ValueError("players_needed must be at least 1")
        if v > 50:
            raise ValueError("players_needed cannot be more than 50")
        return v

    @field_validator("skill_level")
    @classmethod
    def validate_skill_level(cls, v: str) -> str:
        if v not in SkillLevel.ALL:
            raise ValueError(f"skill_level must be one of {SkillLevel.ALL}")
        return v

    @field_validator("sport", "location")
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        return v


class MatchUpdate(BaseModel):
    sport: str | None = None
    location: str | None = None
    date: date_type | None = None
    time: time_type | None = None
    players_needed: int | None = Field(
        default=None,
        ge=1,
        description="Number of additional players needed, excluding the host",
    )
    skill_level: str | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one match field must be provided")
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Match fields cannot be null")
        return self

    @field_validator("skill_level")
    @classmethod
    def validate_skill_level(cls, v: str | None) -> str | None:
        if v is not None and v not in SkillLevel.ALL:
            raise ValueError(f"skill_level must be one of {SkillLevel.ALL}")
        return v

    @field_validator("sport", "location")
    @classmethod
    def validate_not_empty(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        return v


class MatchPlayerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    joined_at: datetime


class MatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sport: str
    location: str
    date: date_type
    time: time_type
    players_needed: int
    skill_level: str
    status: str
    created_by: UUID
    host_name: str | None = None
    created_at: datetime
    court_id: UUID | None = None
    court_duration_minutes: int | None = None
    court_name: str | None = None
    venue_id: UUID | None = None
    venue_name: str | None = None
    court_booking_status: str | None = None


class MatchListRead(MatchRead):
    joined_count: int
    joined_count_excluding_host: int


class MatchDetailRead(MatchRead):
    players: list[MatchPlayerRead] = []


class PaginatedMatches(BaseModel):
    items: list[MatchListRead]
    total: int
    page: int
    page_size: int

class RecommendedMatch(MatchRead):
    score: float
    joined_count: int
    joined_count_excluding_host: int

class PaginatedRecommendedMatches(BaseModel):
    items: list[RecommendedMatch]
    total: int
    page: int
    page_size: int
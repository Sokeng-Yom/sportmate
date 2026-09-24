from datetime import date, time, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator

from app.core.enums import SkillLevel


class MatchCreate(BaseModel):
    sport: str
    location: str
    date: date
    time: time
    players_needed: int
    skill_level: str

    @field_validator("players_needed")
    @classmethod
    def validate_players_needed(cls, v: int) -> int:
        if v < 2:
            raise ValueError("players_needed must be at least 2")
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
    date: date
    time: time
    players_needed: int
    skill_level: str
    status: str
    created_by: UUID
    created_at: datetime


class MatchDetailRead(MatchRead):
    players: list[MatchPlayerRead] = []


class PaginatedMatches(BaseModel):
    items: list[MatchRead]
    total: int
    page: int
    page_size: int

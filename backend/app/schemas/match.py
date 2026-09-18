from datetime import date, time, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class MatchCreate(BaseModel):
    sport: str
    location: str
    date: date
    time: time
    players_needed: int
    skill_level: str


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


class MatchUpdate(BaseModel):
    status: str | None = None
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator

from app.core.enums import SkillLevel


class UserSportCreate(BaseModel):
    sport: str
    skill_level: str

    @field_validator("skill_level")
    @classmethod
    def validate_skill_level(cls, v: str) -> str:
        if v not in SkillLevel.ALL:
            raise ValueError(f"skill_level must be one of {SkillLevel.ALL}")
        return v

    @field_validator("sport")
    @classmethod
    def validate_sport(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("sport must not be empty")
        return v.title()


class UserSportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    sport: str
    skill_level: str


class UserSportUpdate(BaseModel):
    sport: str | None = None
    skill_level: str | None = None

    @field_validator("skill_level")
    @classmethod
    def validate_skill_level(cls, v: str | None) -> str | None:
        if v is not None and v not in SkillLevel.ALL:
            raise ValueError(f"skill_level must be one of {SkillLevel.ALL}")
        return v

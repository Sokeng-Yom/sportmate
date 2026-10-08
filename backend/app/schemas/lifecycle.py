from uuid import UUID

from pydantic import BaseModel


class LeaveRiskPreview(BaseModel):
    risk_level: str
    hours_remaining: float
    will_restrict: bool
    restriction_days: int


class WaitingListJoined(BaseModel):
    id: UUID
    position: int
    status: str


class WaitingListAccepted(BaseModel):
    status: str

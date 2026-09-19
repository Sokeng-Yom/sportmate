# app/api/v1/venues.py
from fastapi import APIRouter, Depends

from app.core.security import require_role

router = APIRouter(prefix="/api/v1/venues", tags=["venues"])


@router.get("/ping")
def venues_ping(user: dict = Depends(require_role("VENUE_OWNER"))):
    return {"message": "pong", "role": "VENUE_OWNER"}
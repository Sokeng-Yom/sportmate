# app/api/v1/profiles.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.profile import Profile
from app.schemas.profile import ProfileRead, ProfileUpdate

router = APIRouter(prefix="/api/v1/profiles", tags=["profiles"])


@router.get(
    "/me",
    response_model=ProfileRead,
    summary="Get the current user's profile",
    description=(
        "Returns the profile linked to the authenticated Supabase user. "
        "Requires a valid Supabase access token in the Authorization header."
    ),
)
def get_my_profile(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.id == user["sub"]).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch(
    "/me",
    response_model=ProfileRead,
    summary="Update the current user's profile",
    description=(
        "Updates name and/or avatar for the authenticated user. "
        "Role cannot be changed through this endpoint."
    ),
)
def update_my_profile(
    payload: ProfileUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.id == user["sub"]).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = payload.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)

    return profile
# Endpoints (GET /me, PATCH /me, etc.) get built in Week 3 (Days 12+),
# once auth is fully wired up. This file just establishes the router
# so it shows up in /docs today.
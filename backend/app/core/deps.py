from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.profile import Profile


def get_current_profile(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    profile = db.query(Profile).filter(Profile.id == user["sub"]).first()
    if profile is None:
        raise HTTPException(status_code=401, detail="Account not found")
    return profile


def require_profile_role(*allowed_roles: str):
    """Like security.require_role, but hands the endpoint the caller's Profile object."""

    def dependency(profile: Profile = Depends(get_current_profile)) -> Profile:
        if profile.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission to access this resource")
        return profile

    return dependency

from fastapi import Header, HTTPException, Depends
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.profile import Profile


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if "sub" not in payload:
        raise HTTPException(status_code=401, detail="Token missing required claim")

    return payload


def require_role(*allowed_roles: str):
    def dependency(
        user: dict = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict:
        profile = db.query(Profile).filter(Profile.id == user["sub"]).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        if profile.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission to access this resource")
        return user

    return dependency

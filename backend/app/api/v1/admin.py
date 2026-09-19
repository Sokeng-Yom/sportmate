# app/api/v1/admin.py
from fastapi import APIRouter, Depends

from app.core.security import require_role

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/ping")
def admin_ping(user: dict = Depends(require_role("ADMIN"))):
    return {"message": "pong", "role": "ADMIN"}
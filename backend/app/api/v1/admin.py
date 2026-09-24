# app/api/v1/admin.py
from fastapi import APIRouter, Depends

from app.core.security import require_role

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get(
    "/ping",
    summary="Admin connectivity check",
    description=(
        "Returns a simple pong response. Requires the ADMIN role. "
        "Used to verify RBAC is correctly enforced for admin-only endpoints."
    ),
)
def admin_ping(user: dict = Depends(require_role("ADMIN"))):
    return {"message": "pong", "role": "ADMIN"}
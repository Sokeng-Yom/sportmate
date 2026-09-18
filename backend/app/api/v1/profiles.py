# app/api/v1/profiles.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/profiles", tags=["profiles"])


# Endpoints (GET /me, PATCH /me, etc.) get built in Week 3 (Days 12+),
# once auth is fully wired up. This file just establishes the router
# so it shows up in /docs today.
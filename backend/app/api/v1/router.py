from fastapi import APIRouter

from app.api.v1 import (
    admin,
    admin_console,
    admin_posts,
    admin_venues,
    bookings,
    chat,
    court_search,
    courts,
    matches,
    notifications,
    posts,
    profiles,
    sports,
    venues,
    waiting_list,
)

api_router = APIRouter()

# Order matters where paths overlap: routers with FIXED paths (e.g. /courts/search)
# must be included before routers with /{id} paths on the same prefix.
for module in (
    profiles, admin, admin_console, admin_venues, admin_posts, venues, court_search, courts,
    bookings, sports, matches, chat, waiting_list, posts, notifications,
):
    api_router.include_router(module.router)

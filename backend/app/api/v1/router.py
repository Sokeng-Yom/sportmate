from fastapi import APIRouter

from app.api.v1 import admin, admin_venues, courts, matches, profiles, sports, venues, waiting_list

api_router = APIRouter()

# Order matters where paths overlap: routers with FIXED paths (e.g. /courts/search)
# must be included before routers with /{id} paths on the same prefix.
for module in (profiles, admin, admin_venues, venues, courts, sports, matches, waiting_list):
    api_router.include_router(module.router)

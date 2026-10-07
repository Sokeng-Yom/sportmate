from app.api.v1.profiles import router as profiles_router
from app.api.v1.admin import router as admin_router
from app.api.v1.venues import router as venues_router
from app.api.v1.sports import router as sports_router
from app.api.v1.matches import router as matches_router
from app.db.session import SessionLocal
from app.services.waiting_list_expiry import expire_stale_waiting_list_entries
from fastapi import Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.db.session import get_db

import time
import logging
from app.core.logging_config import configure_logging

from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
app = FastAPI(
    title="SportMate API",
    description=(
        "Business logic and secure API layer for SportMate. "
        "Authentication is handled by Supabase Auth; every protected endpoint "
        "expects a Supabase access token in the Authorization header "
        "(`Authorization: Bearer <token>`)."
    ),
    version="0.1.0",
)
app.include_router(profiles_router)
app.include_router(admin_router)
app.include_router(venues_router)
app.include_router(sports_router)
app.include_router(matches_router)

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

configure_logging()
logger = logging.getLogger("sportmate")

@app.middleware("http")
async def log_requests(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(
        "%s %s -> %s (%.1fms)",
        request.method, request.url.path, response.status_code, duration_ms,
    )
    return response

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).scalar()
    return {"db_status": "ok", "result": result}
def run_expiry_check():
    db = SessionLocal()
    try:
        expired = expire_stale_waiting_list_entries(db)
        if expired:
            logger.info("Expired %d stale waiting list entries", expired)
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(run_expiry_check, "interval", minutes=1)


@app.on_event("startup")
def start_scheduler():
    scheduler.start()


@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()

app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

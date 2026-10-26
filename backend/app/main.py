import logging
import time

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging_config import configure_logging
from app.db.session import SessionLocal, get_db
from app.services.match_lifecycle import close_finished_matches
from app.services.match_lifecycle import close_finished_matches
from app.services.waiting_list_expiry import expire_stale_waiting_list_entries

# Add your frontend teammate's origin here if it differs (exact scheme + host + port).
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

configure_logging()
logger = logging.getLogger("sportmate")

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

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).scalar()
    return {"db_status": "ok", "result": result}


app.include_router(api_router)


def run_expiry_check():
    db = SessionLocal()
    try:
        expired = expire_stale_waiting_list_entries(db)
        if expired:
            logger.info("Expired %d stale waiting list entries", expired)
    finally:
        db.close()


def run_match_lifecycle_check():
    db = SessionLocal()
    try:
        closed = close_finished_matches(db)
        if closed:
            logger.info("Closed %d finished matches", closed)
    finally:
        db.close()


def run_match_lifecycle_check():
    db = SessionLocal()
    try:
        closed = close_finished_matches(db)
        if closed:
            logger.info("Closed %d finished matches", closed)
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(run_expiry_check, "interval", minutes=1)
scheduler.add_job(run_match_lifecycle_check, "interval", minutes=5)
scheduler.add_job(run_match_lifecycle_check, "interval", minutes=5)


@app.on_event("startup")
def start_scheduler():
    scheduler.start()


@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()


# Registered BEFORE CORSMiddleware so CORS ends up outermost and answers preflight requests.
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


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

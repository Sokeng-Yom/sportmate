import logging

from fastapi import Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("sportmate")


async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Flatten Pydantic's error list into a single readable message
    first_error = exc.errors()[0]
    field = ".".join(str(loc) for loc in first_error["loc"])
    message = f"{field}: {first_error['msg']}"
    return JSONResponse(status_code=422, content={"detail": message})


async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
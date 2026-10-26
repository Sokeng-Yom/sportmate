import json
import logging
import time
import urllib.request
from base64 import urlsafe_b64decode
from uuid import UUID

from fastapi import Header, HTTPException, Depends
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.profile import Profile

logger = logging.getLogger("sportmate.security")

# Supabase publishes the public half of its token signing key here. Projects
# created after the asymmetric-key rollout sign access tokens with ES256
# (P-256), which the old symmetric SUPABASE_JWT_SECRET can never verify.
_JWKS_CACHE: list[dict] | None = None
_JWKS_CACHE_AT = 0.0
_JWKS_TTL_SECONDS = 3600


def _jwks_url() -> str:
    return settings.supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"


def _jwt_secret_candidates() -> list[str]:
    """Every configured HS256 signing key, in precedence order, without duplicates."""
    secrets: list[str] = []
    for candidate in (settings.supabase_jwt_secret, settings.jwt_secret, settings.sb_jwt_secret):
        if candidate and candidate not in secrets:
            secrets.append(candidate)
    return secrets


def _fetch_jwks_keys() -> list[dict]:
    """Fetches the JWKS document from the Supabase project (public keys only)."""
    with urllib.request.urlopen(_jwks_url(), timeout=10) as response:
        document = json.loads(response.read().decode("utf-8") or "{}")
    return document.get("keys") or []


def _get_public_keys() -> list[dict]:
    """The project's public signing keys, fetched once and cached for an hour.

    Best-effort: if the refresh fails and no key was ever loaded, the caller
    simply falls back to the symmetric-secret path and returns 401 for tokens
    that do not verify with any configured key.
    """
    global _JWKS_CACHE, _JWKS_CACHE_AT
    now = time.time()
    if _JWKS_CACHE is not None and (now - _JWKS_CACHE_AT) < _JWKS_TTL_SECONDS:
        return _JWKS_CACHE
    try:
        _JWKS_CACHE = _fetch_jwks_keys()
        _JWKS_CACHE_AT = now
    except Exception as exc:
        logger.warning("Could not refresh Supabase JWKS: %s", exc)
        if _JWKS_CACHE is None:
            _JWKS_CACHE = []
    return _JWKS_CACHE


def _b64url_bytes(value: str) -> bytes:
    return urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _public_key_from_jwk(key: dict):
    """Builds a verification key for python-jose from a JWK dict (ES256 P-256 / RSA)."""
    kty = key.get("kty")
    if kty == "EC":
        from cryptography.hazmat.primitives.asymmetric import ec
        x = int.from_bytes(_b64url_bytes(key["x"]), "big")
        y = int.from_bytes(_b64url_bytes(key["y"]), "big")
        return ec.EllipticCurvePublicNumbers(x, y, ec.SECP256R1()).public_key()
    if kty == "RSA":
        from cryptography.hazmat.primitives.asymmetric import rsa
        n = int.from_bytes(_b64url_bytes(key["n"]), "big")
        e = int.from_bytes(_b64url_bytes(key["e"]), "big")
        return rsa.RSAPublicNumbers(e, n).public_key()
    raise JWTError(f"Unsupported JWK key type: {kty}")


def _decode_with_jwks(token: str, key: dict) -> dict:
    alg = key.get("alg") or ("ES256" if key.get("kty") == "EC" else "RS256")
    return jwt.decode(token, _public_key_from_jwk(key), algorithms=[alg], audience="authenticated")


def _verify_token(token: str) -> dict:
    """Verifies a Supabase access token using every trusted signing method.

    1. HS256 symmetric secrets (legacy projects).
    2. The asymmetric key published in the project's JWKS (current projects
       sign access tokens with ES256 / P-256).

    A token is rejected with 401 unless its signature verifies with one of the
    trusted keys and its audience and expiry claims hold.
    """
    expired = False

    for secret in _jwt_secret_candidates():
        try:
            return jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
        except ExpiredSignatureError:
            expired = True
        except JWTError:
            continue

    for key in _get_public_keys():
        try:
            return _decode_with_jwks(token, key)
        except ExpiredSignatureError:
            expired = True
        except JWTError:
            continue

    if expired:
        raise HTTPException(status_code=401, detail="Token has expired")
    raise HTTPException(status_code=401, detail="Invalid token")


# def get_current_user(authorization: str | None = Header(default=None)) -> dict:
#     if not authorization or not authorization.startswith("Bearer "):
#         raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

#     token = authorization.removeprefix("Bearer ").strip()
#     if not token:
#         raise HTTPException(status_code=401, detail="Missing bearer token")

#     payload = _verify_token(token)

#     if "sub" not in payload:
#         raise HTTPException(status_code=401, detail="Token missing required claim")

#     return payload


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    payload = _verify_token(token)

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Token missing required claim")

    try:
        UUID(str(subject))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=401, detail="Token has an invalid subject")

    return payload


def require_role(*allowed_roles: str):
    def dependency(
        user: dict = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict:
        profile = db.query(Profile).filter(Profile.id == user["sub"]).first()
        if not profile:
            raise HTTPException(status_code=401, detail="Account not found")
        if profile.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission to access this resource")
        return user

    return dependency

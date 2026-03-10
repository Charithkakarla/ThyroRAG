"""
Clerk JWT verification middleware for FastAPI.

How it works:
  1. The React frontend calls Clerk's getToken() which issues a short-lived
     RS256 JWT signed with Clerk's private key.
  2. The frontend sends that token in the Authorization header.
  3. This middleware fetches Clerk's JWKS (public keys), caches them, and
     verifies the JWT signature + standard claims.
  4. The Clerk user ID (``sub`` claim) is returned as ``current_user.id``
     so all existing Supabase queries (``eq("user_id", current_user.id)``)
     continue to work without modification.

Environment variables required in backend/.env:
  CLERK_JWKS_URL  – e.g. https://<your-domain>.clerk.accounts.dev/.well-known/jwks.json
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.algorithms import RSAAlgorithm

security = HTTPBearer()

# ── JWKS cache ──────────────────────────────────────────────────────────────
_jwks_cache: dict[str, Any] = {}   # kid  → public key object
_jwks_fetched_at: float = 0
_JWKS_TTL = 3600  # seconds – refresh public keys once per hour


def _get_clerk_jwks_url() -> str:
    url = os.getenv("CLERK_JWKS_URL", "")
    if not url:
        raise RuntimeError(
            "CLERK_JWKS_URL is not set in the environment. "
            "Add it to backend/.env (e.g. https://<clerk-domain>/.well-known/jwks.json)."
        )
    return url


def _fetch_jwks() -> None:
    """Fetch and cache Clerk's public keys (JWKS)."""
    global _jwks_cache, _jwks_fetched_at
    jwks_url = _get_clerk_jwks_url()
    response = httpx.get(jwks_url, timeout=10)
    response.raise_for_status()
    keys = response.json().get("keys", [])
    _jwks_cache = {
        key["kid"]: RSAAlgorithm.from_jwk(key)
        for key in keys
    }
    _jwks_fetched_at = time.time()


def _get_public_key(kid: str):
    """Return the cached public key for *kid*, refreshing if stale."""
    if not _jwks_cache or time.time() - _jwks_fetched_at > _JWKS_TTL:
        _fetch_jwks()
    key = _jwks_cache.get(kid)
    if key is None:
        # Try one forced refresh in case the key was rotated
        _fetch_jwks()
        key = _jwks_cache.get(kid)
    return key


# ── Verified-user dataclass ──────────────────────────────────────────────────
@dataclass
class ClerkUser:
    id: str          # Clerk user_id (sub claim) – used as user_id in Supabase
    email: str       # primary email extracted from token claims (may be empty)
    payload: dict    # full decoded JWT payload for advanced use


# ── FastAPI dependency ───────────────────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> ClerkUser:
    """
    FastAPI dependency that verifies a Clerk JWT from the Authorization header.

    Usage:
        @app.get("/protected")
        async def protected(current_user: ClerkUser = Depends(get_current_user)):
            return {"user_id": current_user.id}
    """
    token = credentials.credentials

    # Decode header without verification to retrieve ``kid``
    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed JWT: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    kid = header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="JWT missing 'kid' header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    public_key = _get_public_key(kid)
    if public_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown JWT signing key – JWKS rotation in progress?",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify signature and standard claims
    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk tokens may not include aud
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Clerk puts the primary email in email_addresses or as email in the session
    email = (
        payload.get("email")
        or payload.get("primary_email_address")
        or ""
    )

    return ClerkUser(id=user_id, email=email, payload=payload)


"""
Auth routes – Clerk edition.

Sign-up / sign-in are handled entirely on the frontend via Clerk components.
The backend only needs to:
  • Verify who the caller is  (/auth/me)
  • Upsert the Clerk user profile into Supabase  (/auth/sync-profile)

All routes require a valid Clerk JWT in the Authorization header.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from supabase_client import supabase
from auth.auth_middleware import get_current_user, ClerkUser

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class ProfileSyncRequest(BaseModel):
    name: str = ""
    email: str = ""


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.get("/me")
async def get_me(current_user: ClerkUser = Depends(get_current_user)):
    """Return the authenticated user's Clerk ID and email."""
    # Optionally enrich from Supabase profiles table
    try:
        resp = (
            supabase.table("profiles")
            .select("*")
            .eq("id", current_user.id)
            .maybe_single()
            .execute()
        )
        profile = resp.data or {}
    except Exception:
        profile = {}

    return {
        "id": current_user.id,
        "email": current_user.email or profile.get("email", ""),
        "name": profile.get("name", ""),
        "created_at": profile.get("created_at"),
    }


@router.post("/sync-profile", status_code=status.HTTP_200_OK)
async def sync_profile(
    body: ProfileSyncRequest,
    current_user: ClerkUser = Depends(get_current_user),
):
    """
    Upsert the Clerk user's basic info into the Supabase ``profiles`` table.
    Called by the frontend after every sign-in to keep the DB in sync.
    """
    try:
        resp = (
            supabase.table("profiles")
            .upsert(
                {
                    "id": current_user.id,
                    "email": body.email or current_user.email,
                    "name": body.name,
                },
                on_conflict="id",
            )
            .execute()
        )
        return {"message": "Profile synced", "profile": resp.data[0] if resp.data else {}}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile sync failed: {exc}",
        )


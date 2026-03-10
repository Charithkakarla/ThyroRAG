-- ============================================================
-- Supabase: profiles table for Clerk-authenticated users
-- Run this in the Supabase SQL Editor once.
-- ============================================================

-- profiles stores one row per Clerk user.
-- The primary key is the Clerk user ID (user_xxxxx string).
CREATE TABLE IF NOT EXISTS public.profiles (
    id          TEXT        PRIMARY KEY,          -- Clerk user_id (sub claim)
    email       TEXT        NOT NULL DEFAULT '',
    name        TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automatically update updated_at on every row update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row-Level Security: users can only read/write their own row.
-- NOTE: with Clerk auth, Supabase RLS cannot verify Clerk JWTs directly.
-- Either:
--   (a) Disable RLS and trust your FastAPI backend to gate access (recommended), OR
--   (b) Set up Supabase as a Clerk JWT template and enable RLS with auth.uid() = id.
-- The simplest approach is (a): disable RLS and let FastAPI enforce access control.

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- If you later want to make the profiles table publicly readable (but private
-- for writes) via Supabase's service role key from the backend:
-- GRANT SELECT ON public.profiles TO anon;
-- GRANT ALL    ON public.profiles TO service_role;

-- ── predictions table ───────────────────────────────────────────────────────
-- The user_id column stores the Clerk user ID (text, not uuid).
-- If your predictions table was created with user_id UUID, alter it:
-- ALTER TABLE public.predictions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ── queries table ───────────────────────────────────────────────────────────
-- Same – ensure user_id is TEXT.
-- ALTER TABLE public.queries ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

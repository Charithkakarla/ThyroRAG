-- ============================================================
-- ThyroRAG · Supabase Complete Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
-- NOTE: id is TEXT because Clerk user IDs (e.g. "user_abc123") are not UUIDs
CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,
  full_name   TEXT,
  age         INTEGER,
  gender      TEXT CHECK (gender IN ('M', 'F', 'Other')),
  phone       TEXT,
  role        TEXT DEFAULT 'Patient' CHECK (role IN ('Patient', 'Doctor', 'Admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role full access on profiles" ON profiles;

CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Service role full access on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- ── 2. PREDICTIONS ───────────────────────────────────────────
-- NOTE: user_id is TEXT to store Clerk user IDs ("user_abc123" format, not UUID)
CREATE TABLE IF NOT EXISTS predictions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          TEXT NOT NULL,
  age              FLOAT,
  sex              TEXT,
  weight           FLOAT,
  -- Hormone levels
  tsh              FLOAT,
  t3               FLOAT,
  tt4              FLOAT,
  t4u              FLOAT,
  fti              FLOAT,
  tbg              FLOAT,
  -- Medical history flags
  on_thyroxine                BOOLEAN DEFAULT FALSE,
  query_on_thyroxine          BOOLEAN DEFAULT FALSE,
  on_antithyroid_medication   BOOLEAN DEFAULT FALSE,
  sick                        BOOLEAN DEFAULT FALSE,
  pregnant                    BOOLEAN DEFAULT FALSE,
  thyroid_surgery             BOOLEAN DEFAULT FALSE,
  i131_treatment              BOOLEAN DEFAULT FALSE,
  query_hypothyroid           BOOLEAN DEFAULT FALSE,
  query_hyperthyroid          BOOLEAN DEFAULT FALSE,
  lithium                     BOOLEAN DEFAULT FALSE,
  goitre                      BOOLEAN DEFAULT FALSE,
  tumor                       BOOLEAN DEFAULT FALSE,
  hypopituitary               BOOLEAN DEFAULT FALSE,
  psych                       BOOLEAN DEFAULT FALSE,
  -- Results
  prediction       TEXT NOT NULL,
  confidence       FLOAT NOT NULL,
  prob_negative    FLOAT,
  prob_hypothyroid FLOAT,
  prob_hyperthyroid FLOAT,
  source           TEXT DEFAULT 'manual_entry',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own predictions"          ON predictions;
DROP POLICY IF EXISTS "Users can insert own predictions"        ON predictions;
DROP POLICY IF EXISTS "Service role full access on predictions" ON predictions;

CREATE POLICY "Users can view own predictions"   ON predictions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own predictions" ON predictions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Service role full access on predictions" ON predictions FOR ALL USING (true) WITH CHECK (true);

-- ── 3. REPORTS ───────────────────────────────────────────────
-- NOTE: user_id is TEXT to store Clerk user IDs
CREATE TABLE IF NOT EXISTS reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    TEXT,
  file_size    INTEGER,
  description  TEXT,
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports"   ON reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;

CREATE POLICY "Users can view own reports"   ON reports FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own reports" ON reports FOR DELETE USING (auth.uid()::text = user_id);

-- ── 4. QUERIES (RAG Chat History) ───────────────────────────
-- NOTE: user_id is TEXT to store Clerk user IDs
CREATE TABLE IF NOT EXISTS queries (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT NOT NULL,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own queries"          ON queries;
DROP POLICY IF EXISTS "Users can insert own queries"        ON queries;
DROP POLICY IF EXISTS "Service role full access on queries" ON queries;

CREATE POLICY "Users can view own queries"   ON queries FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own queries" ON queries FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Service role full access on queries" ON queries FOR ALL USING (true) WITH CHECK (true);

-- ── 5. Auto-create profile on signup ────────────────────────
-- NOTE: This trigger fires for Supabase-native signups only.
-- For Clerk-authenticated users, profiles are upserted by the backend on first login.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 6. Auto-update updated_at on profiles ───────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 7. INCREMENTAL UPDATES (Run if already have the tables) ──
-- Ensure source column exists on predictions
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='predictions' AND column_name='source') THEN
    ALTER TABLE predictions ADD COLUMN source TEXT DEFAULT 'manual_entry';
  END IF;
END $$;

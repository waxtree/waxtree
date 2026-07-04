-- ============================================================
-- WaxTree — Supabase Database Schema
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
-- Extends auth.users with plan, Discogs connection and settings.
-- Created automatically on sign-up via the trigger below.
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT,
  username         TEXT,
  plan             TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  premium_until    TIMESTAMPTZ,           -- NULL = no expiry (lifetime) or not premium
  search_count     INTEGER NOT NULL DEFAULT 0,
  discogs_username TEXT,
  discogs_synced_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1))
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── Woods (Branches) ─────────────────────────────────────────
-- Each user can have multiple woods; free users are limited to 3
-- (enforced at application layer + optional DB trigger below).
CREATE TABLE IF NOT EXISTS public.woods (
  id         TEXT        PRIMARY KEY,          -- client-generated: 'b' + Date.now()
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT 'Wood 1',
  position   SMALLINT    NOT NULL DEFAULT 0,   -- display order
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS woods_user_idx ON public.woods(user_id);

-- Optional: enforce free-plan wood limit at DB level
CREATE OR REPLACE FUNCTION public.check_wood_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  user_plan TEXT;
  wood_count INTEGER;
BEGIN
  SELECT plan INTO user_plan FROM public.profiles WHERE id = NEW.user_id;
  IF user_plan = 'free' THEN
    SELECT COUNT(*) INTO wood_count FROM public.woods WHERE user_id = NEW.user_id;
    IF wood_count >= 3 THEN
      RAISE EXCEPTION 'Free plan limit: maximum 3 woods allowed';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER enforce_wood_limit
  BEFORE INSERT ON public.woods
  FOR EACH ROW EXECUTE FUNCTION public.check_wood_limit();


-- ── Nodes (Artists / Labels) ─────────────────────────────────
-- Each node belongs to a wood and optionally has a parent node
-- (sub-exploration). Free users are limited to 15 nodes per wood.
CREATE TABLE IF NOT EXISTS public.nodes (
  id          TEXT        PRIMARY KEY,          -- client-generated UUID/nanoid
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wood_id     TEXT        NOT NULL REFERENCES public.woods(id) ON DELETE CASCADE,
  parent_id   TEXT        REFERENCES public.nodes(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL CHECK (type IN ('artist', 'label')),
  name        TEXT        NOT NULL,
  discogs_id  INTEGER,                          -- Discogs artist or label ID
  pinned      BOOLEAN     NOT NULL DEFAULT FALSE,
  loaded      BOOLEAN     NOT NULL DEFAULT FALSE,
  data        JSONB,                            -- cached Discogs data (tracks, bio, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nodes_wood_idx    ON public.nodes(wood_id);
CREATE INDEX IF NOT EXISTS nodes_user_idx    ON public.nodes(user_id);
CREATE INDEX IF NOT EXISTS nodes_parent_idx  ON public.nodes(parent_id);
CREATE INDEX IF NOT EXISTS nodes_discogs_idx ON public.nodes(discogs_id);

-- Optional: enforce free-plan node-per-wood limit at DB level
CREATE OR REPLACE FUNCTION public.check_node_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  user_plan  TEXT;
  node_count INTEGER;
BEGIN
  SELECT plan INTO user_plan FROM public.profiles WHERE id = NEW.user_id;
  IF user_plan = 'free' THEN
    SELECT COUNT(*) INTO node_count FROM public.nodes
    WHERE user_id = NEW.user_id AND wood_id = NEW.wood_id;
    IF node_count >= 15 THEN
      RAISE EXCEPTION 'Free plan limit: maximum 15 nodes per wood allowed';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER enforce_node_limit
  BEFORE INSERT ON public.nodes
  FOR EACH ROW EXECUTE FUNCTION public.check_node_limit();


-- ── Node Tags ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.node_tags (
  id       BIGSERIAL PRIMARY KEY,
  node_id  TEXT NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag      TEXT NOT NULL,
  UNIQUE (node_id, tag)
);

CREATE INDEX IF NOT EXISTS node_tags_node_idx ON public.node_tags(node_id);
CREATE INDEX IF NOT EXISTS node_tags_user_idx ON public.node_tags(user_id);


-- ── Likes ────────────────────────────────────────────────────
-- Tracks liked by a user (track_id is a Discogs release/track identifier).
CREATE TABLE IF NOT EXISTS public.likes (
  id        BIGSERIAL   PRIMARY KEY,
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id  TEXT        NOT NULL,
  liked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, track_id)
);

CREATE INDEX IF NOT EXISTS likes_user_idx ON public.likes(user_id);


-- ── Listen Later ─────────────────────────────────────────────
-- Queue of tracks the user wants to listen to.
CREATE TABLE IF NOT EXISTS public.listen_later (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id    TEXT        NOT NULL,
  track_data  JSONB       NOT NULL,    -- snapshot: title, artist, label, year, duration
  position    SMALLINT    NOT NULL DEFAULT 0,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, track_id)
);

CREATE INDEX IF NOT EXISTS listen_later_user_idx ON public.listen_later(user_id);


-- ── Listen History ───────────────────────────────────────────
-- Tracks the user has played (kept for stats and discovery).
CREATE TABLE IF NOT EXISTS public.listen_history (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id    TEXT        NOT NULL,
  track_data  JSONB       NOT NULL,
  played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listen_history_user_idx ON public.listen_history(user_id);
CREATE INDEX IF NOT EXISTS listen_history_played_idx ON public.listen_history(played_at DESC);


-- ── Discogs Collection Cache ─────────────────────────────────
-- Mirrors the user's Discogs collection (release + master IDs).
-- Refreshed on each OAuth sync.
CREATE TABLE IF NOT EXISTS public.discogs_collection (
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id INTEGER NOT NULL,
  master_id  INTEGER,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, release_id)
);

CREATE INDEX IF NOT EXISTS discogs_coll_user_idx ON public.discogs_collection(user_id);


-- ── Discogs Wantlist Cache ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.discogs_wantlist (
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id INTEGER NOT NULL,
  master_id  INTEGER,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, release_id)
);

CREATE INDEX IF NOT EXISTS discogs_want_user_idx ON public.discogs_wantlist(user_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woods             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listen_later      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listen_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discogs_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discogs_wantlist  ENABLE ROW LEVEL SECURITY;

-- profiles: each user sees and edits only their own row
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- woods
CREATE POLICY "woods_all_own"  ON public.woods  FOR ALL USING (auth.uid() = user_id);

-- nodes
CREATE POLICY "nodes_all_own"  ON public.nodes  FOR ALL USING (auth.uid() = user_id);

-- node_tags
CREATE POLICY "node_tags_all_own" ON public.node_tags FOR ALL USING (auth.uid() = user_id);

-- likes
CREATE POLICY "likes_all_own" ON public.likes FOR ALL USING (auth.uid() = user_id);

-- listen_later
CREATE POLICY "listen_later_all_own" ON public.listen_later FOR ALL USING (auth.uid() = user_id);

-- listen_history
CREATE POLICY "listen_history_all_own" ON public.listen_history FOR ALL USING (auth.uid() = user_id);

-- discogs_collection
CREATE POLICY "discogs_coll_all_own" ON public.discogs_collection FOR ALL USING (auth.uid() = user_id);

-- discogs_wantlist
CREATE POLICY "discogs_want_all_own" ON public.discogs_wantlist FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- HELPER: promote a user to premium
-- Call this from an Edge Function after successful payment.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_premium(target_user_id UUID, until TIMESTAMPTZ DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET plan = 'premium', premium_until = until, updated_at = NOW()
  WHERE id = target_user_id;
  -- Also write to auth.users.raw_user_meta_data so the client sees it immediately
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"premium": true}'::jsonb
  WHERE id = target_user_id;
END; $$;

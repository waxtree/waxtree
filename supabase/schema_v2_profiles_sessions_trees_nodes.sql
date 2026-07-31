-- ============================================================
-- WaxTree — Definitive schema: profiles / sessions / trees / nodes
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor (or via
-- `supabase db push` / `supabase db query` from a linked CLI).
--
-- Idempotent by design: every CREATE TABLE uses IF NOT EXISTS, the
-- root_node_id foreign key is added through a guarded DO block, and
-- every policy is dropped-then-recreated (safe — policies carry no
-- data). Re-running this file is always safe and never touches
-- existing rows. Confirmed live (2026-07-30) against the actual
-- project: none of these four tables exist yet — the app today
-- persists everything through the single `user_state` JSONB blob
-- (see supabase/user_state.sql), not this relational shape.
--
-- IMPORTANT — this schema is NOT wired into the app yet. preview.html
-- only ever reads/writes user_state, digging_events, follows, and
-- yt_video_matches/yt_channel_matches. Creating these tables makes
-- them available but changes nothing about how WaxTree behaves until
-- the client is rewritten to actually use them instead of (or
-- alongside) user_state.
-- ============================================================

-- ── profiles ──────────────────────────────────────────────
-- One row per auth user. id IS the auth.users id (not a separate
-- surrogate key) so a profile can never point at the wrong account.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tier       text not null default 'free' check (tier in ('free','premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-provision a profile row the moment someone signs up — without
-- this, profiles stays empty forever unless the client remembers to
-- insert one itself after every signup, on every platform, forever.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── sessions ──────────────────────────────────────────────
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Untitled session',
  is_saved   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── trees ─────────────────────────────────────────────────
-- root_node_id is nullable and has no FK yet at table-creation time —
-- trees and nodes reference each other (a tree points at its root
-- node, a node points at its tree), so the node has to exist first.
-- Real flow: insert the tree with root_node_id = null, insert its root
-- node with tree_id set, then update the tree's root_node_id. The FK
-- itself is added below, after the nodes table exists.
create table if not exists public.trees (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  root_node_id uuid,
  created_at   timestamptz not null default now()
);

-- ── nodes ─────────────────────────────────────────────────
create table if not exists public.nodes (
  id              uuid primary key default gen_random_uuid(),
  tree_id         uuid not null references public.trees(id) on delete cascade,
  -- Null for root nodes only. on delete cascade means removing a node
  -- also removes its whole subtree — intentional, matches "the tree"
  -- as a single owned structure, not independently-addressable nodes.
  parent_node_id  uuid references public.nodes(id) on delete cascade,
  -- Plain text, deliberately not an enum or a CHECK-constrained list —
  -- both would need a migration to add a new node type. Validate
  -- allowed values at the application level instead.
  node_type       text not null,
  depth_level     integer not null default 0,
  -- Discogs/MusicBrainz id and which of those two (or a future third
  -- source) it came from — kept as free text for the same
  -- extensibility reason as node_type.
  external_id     text,
  external_source text,
  -- Everything specific to a given node_type lives here instead of as
  -- dedicated columns — new node types never require a schema change.
  data            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Now that nodes exists, wire up trees.root_node_id for real. Guarded
-- so re-running this file doesn't fail on "constraint already exists".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trees_root_node_id_fkey'
  ) then
    alter table public.trees
      add constraint trees_root_node_id_fkey
      foreign key (root_node_id) references public.nodes(id) on delete set null;
  end if;
end $$;

-- ── Indexes ───────────────────────────────────────────────
create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists trees_session_id_idx on public.trees (session_id);
create index if not exists nodes_tree_id_idx on public.nodes (tree_id);
create index if not exists nodes_parent_node_id_idx on public.nodes (parent_node_id);
create index if not exists nodes_external_idx on public.nodes (external_source, external_id);

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.trees    enable row level security;
alter table public.nodes    enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "sessions_own" on public.sessions;
create policy "sessions_own" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- trees/nodes have no user_id column of their own (see the schema
-- above) — ownership is traced back through the session a tree
-- belongs to, so these policies join through it.
drop policy if exists "trees_own" on public.trees;
create policy "trees_own" on public.trees
  for all using (
    exists (select 1 from public.sessions s where s.id = trees.session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s where s.id = trees.session_id and s.user_id = auth.uid())
  );

drop policy if exists "nodes_own" on public.nodes;
create policy "nodes_own" on public.nodes
  for all using (
    exists (
      select 1 from public.trees t
      join public.sessions s on s.id = t.session_id
      where t.id = nodes.tree_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.trees t
      join public.sessions s on s.id = t.session_id
      where t.id = nodes.tree_id and s.user_id = auth.uid()
    )
  );

-- ============================================================
-- Free-tier limits — ENFORCED IN THE APPLICATION, NOT HERE.
-- Deliberately not database constraints/triggers per explicit
-- requirement — a hard DB constraint would block a legitimate admin
-- override, a premium-downgrade grace period, or a limit changing
-- without a migration. Documented here so the numbers live next to
-- the schema they apply to, not because the database enforces them:
--
--   • Free tier: at most 3 sessions with is_saved = true per user.
--     Check: select count(*) from sessions where user_id = :uid and is_saved;
--   • Free tier: at most 4 branch nodes per tree. A "branch node" here
--     means a node with more than one child (where the tree actually
--     forks) — not every node. Check: group nodes by parent_node_id
--     within a tree, count groups where the parent has >1 child.
--   • Free tier: at most 3 depth levels per tree, i.e. depth_level
--     values of 0, 1, 2 only (root = 0) — reject an insert that would
--     need depth_level >= 3 for a free-tier user's tree.
-- ============================================================

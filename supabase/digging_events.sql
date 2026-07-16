-- ============================================================
-- WaxTree — Digging events (Phase 0 of the taste engine)
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor.
--
-- Append-only log of digging behavior: which artist/label a user
-- explored and FROM WHERE (the exploration edge — the signal no other
-- platform records), what they actually listened to, liked, queued
-- and followed. Nothing here powers a visible feature yet; the point
-- is that this dataset starts accumulating from today, so the future
-- recommendation engine has months of proprietary training data on
-- day one instead of starting cold.
--
-- Privacy: rows are scoped to the writing user via RLS and are
-- INSERT-ONLY from the client — no client can read anyone's events
-- (not even their own; aggregation happens server-side later with the
-- service role key).
-- ============================================================

create table if not exists public.digging_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  event      text not null check (event in ('explore','play','like','follow','queue')),
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.digging_events enable row level security;

create policy "digging_events_insert_own" on public.digging_events
  for insert with check (auth.uid() = user_id);

create index if not exists digging_events_user_time
  on public.digging_events (user_id, created_at);
create index if not exists digging_events_type
  on public.digging_events (event);

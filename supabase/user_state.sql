-- ============================================================
-- WaxTree — Cloud backup for app state
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor.
-- Without this table, WaxTree only saves to the browser's
-- localStorage — clearing site data (or switching browsers/devices)
-- wipes woods, nodes, playlists, likes, history and the profile
-- photo with no way to recover them. This table mirrors that same
-- data server-side, scoped to each user via Row Level Security, so
-- it survives a local wipe and is restored automatically on login.
-- ============================================================

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "user_state_all_own" on public.user_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_user_state_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger user_state_updated_at
  before update on public.user_state
  for each row execute function public.touch_user_state_updated_at();

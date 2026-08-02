-- ============================================================
-- WaxTree — Cloud backup HISTORY (append-only insurance)
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor.
--
-- user_state (see user_state.sql) is a single mutable row per user —
-- every save overwrites it with whatever the CURRENT local state is,
-- including an accidentally-empty one. Confirmed live 2026-08-02: a
-- localStorage-quota incident wiped a user's local state, and the very
-- next auto-save silently overwrote their real cloud backup with that
-- empty state, permanently destroying it. A mirror that unconditionally
-- overwrites itself is not a real backup against exactly this failure
-- mode.
--
-- This table is INSERT-only from the client (see policy below — no
-- update/delete policy at all, same discipline digging_events.sql
-- already uses) so nothing the client does can ever destroy a past
-- snapshot. preview.html writes one roughly once an hour (see
-- pushStateToCloud's own throttle) — enough to bound any future data
-- loss to "at most about an hour old" instead of "gone forever", without
-- writing a full snapshot on every single save.
-- ============================================================

create table if not exists public.user_state_history (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.user_state_history enable row level security;

create policy "user_state_history_select_own" on public.user_state_history
  for select using (auth.uid() = user_id);
create policy "user_state_history_insert_own" on public.user_state_history
  for insert with check (auth.uid() = user_id);

create index if not exists user_state_history_user_time
  on public.user_state_history (user_id, created_at desc);

-- Keep only the last 30 snapshots per user — an hourly cadence makes that
-- roughly a month of recovery points, which is generous for "I didn't
-- notice the data loss for a few days" without the table growing forever.
-- Not a scheduled job (this project has no server-side cron) — instead
-- called from the client right after a successful snapshot insert, best
-- effort; even if it's occasionally skipped the table just grows a little
-- extra, never loses safety.
-- security definer so it can DELETE past its own RLS (insert-only) policy —
-- but only ever the CALLING user's own rows: p_user_id is ignored in favor
-- of auth.uid() itself, so this can't be called to prune (or be tricked
-- into deleting) anyone else's history.
create or replace function public.prune_user_state_history()
returns void language plpgsql security definer as $$
begin
  delete from public.user_state_history
  where user_id = auth.uid()
    and id not in (
      select id from public.user_state_history
      where user_id = auth.uid()
      order by created_at desc
      limit 30
    );
end; $$;

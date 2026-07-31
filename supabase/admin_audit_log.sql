-- ============================================================
-- WaxTree — Admin audit log
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor.
--
-- Every tier change made from the admin dashboard (api/admin-set-premium.js)
-- gets one row here. Service-role-only — unlike digging_events (which at
-- least lets a user insert their own rows), this table has NO client-facing
-- policy at all: only the api/_admin.js service-role connection can read or
-- write it, since it exists specifically to answer "who changed what, and
-- when" if that's ever in question.
-- ============================================================

create table if not exists public.admin_audit_log (
  id              bigint generated always as identity primary key,
  admin_id        uuid not null references auth.users(id),
  target_user_id  uuid not null references auth.users(id),
  action          text not null,
  old_value       jsonb,
  new_value       jsonb,
  created_at      timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
-- Deliberately no policies at all — RLS enabled with zero policies means
-- every role except the service role (which bypasses RLS entirely) is
-- denied both read and write, including `authenticated`.

create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_user_id, created_at);

-- ============================================================
-- WaxTree — Waitlist signups
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor.
-- Captures interest from the landing page's "Join the Waitlist" form.
-- No account is created at signup time — this is intentionally just
-- a lead list. Approve people manually (create their account the
-- normal way, e.g. via register.html or the Supabase dashboard) when
-- you're ready to onboard them, then email them their access details.
-- ============================================================

create table if not exists public.waitlist (
  id         bigserial primary key,
  email      text not null unique,
  name       text,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Anyone can submit the form (including anonymous visitors) — but
-- nobody can read the list back from the client, only via the
-- Supabase dashboard (Table Editor) with your own account.
create policy "waitlist_insert_anyone" on public.waitlist
  for insert with check (true);

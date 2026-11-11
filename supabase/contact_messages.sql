-- "Contact us" messages from the app's profile menu, read in /admin.
-- Run once in the Supabase SQL editor (project asmnqlqvlpcwcaaughuu).
--
-- Signed-in users can only INSERT their own rows; nobody can read them from
-- the app. Only the admin API (service role, which bypasses RLS) lists them
-- and marks them read. The sender's email/username are looked up by user_id
-- on the admin side, so they can't be faked from the client.
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bug', 'idea', 'question', 'other')),
  message text not null check (char_length(message) between 1 and 4000),
  page text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "Users send their own contact messages" on public.contact_messages;
create policy "Users send their own contact messages"
  on public.contact_messages for insert
  to authenticated
  with check (auth.uid() = user_id);

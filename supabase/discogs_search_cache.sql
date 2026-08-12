-- ============================================================
-- WaxTree — Shared Discogs raw-request cache
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor.
--
-- discogs_node_cache.sql already shares the fully-ASSEMBLED artist/label
-- node (profile + discography + track data) across every user. This table
-- covers everything that never became a node: raw /database/search calls
-- (artist name lookups, track+artist release searches) and one-off
-- /releases/{id} lookups made outside the node-fetch path — the exact
-- calls matchLibraryWithDiscogs() makes thousands of, once per distinct
-- local artist tag, with most turning up no Discogs match at all. Every
-- WaxTree user with any overlap in their local library (a shared artist,
-- a shared "nobody on Discogs has this name") was redoing that same
-- search from scratch. Keyed by the literal request (path + canonicalized
-- params) rather than a resolved id, since a search doesn't have one yet
-- — that's the whole point of the call. Same 30-day staleness window as
-- discogs_node_cache/the client's own ct2: cache (CT2_TTL_MS).
-- ============================================================

create table if not exists public.discogs_search_cache (
  cache_key text primary key, -- e.g. '/database/search?q=andrew macari&type=artist'
  data      jsonb not null,
  cached_at timestamptz not null default now()
);

create index if not exists discogs_search_cache_cached_at_idx on public.discogs_search_cache (cached_at);

alter table public.discogs_search_cache enable row level security;

drop policy if exists "discogs_search_cache_select" on public.discogs_search_cache;
create policy "discogs_search_cache_select" on public.discogs_search_cache
  for select to authenticated using (true);

drop policy if exists "discogs_search_cache_insert" on public.discogs_search_cache;
create policy "discogs_search_cache_insert" on public.discogs_search_cache
  for insert to authenticated with check (true);

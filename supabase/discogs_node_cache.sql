-- ============================================================
-- WaxTree — Shared Discogs artist/label response cache
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor.
--
-- Opening an artist or label fetches several Discogs endpoints (profile,
-- full discography, one call per release for track data) and can take a
-- real few seconds for anyone with a large catalog. Every user who opens
-- the same artist/label redoes that same work from scratch, even if
-- someone else fetched it minutes ago — this table lets the second (and
-- millionth) person to open "Luke Slater" get it back instantly instead
-- of waiting on Discogs again. Mirrors the existing yt_video_matches /
-- yt_channel_matches shared-cache pattern (see supabase/yt_video_cache.sql)
-- with one difference: unlike a YouTube video match, Discogs data for an
-- artist/label genuinely changes over time (new releases, edited bio), so
-- this needs a real update path and an expiry, not a permanent
-- first-writer-wins row. The client applies the same 30-day staleness
-- window it already uses for its own local cache (CT2_TTL_MS) and the
-- same TRACK_DATA_VERSION check, so a shape change on the client
-- invalidates old shared rows exactly like it invalidates old local ones.
-- ============================================================

create table if not exists public.discogs_node_cache (
  id         text primary key, -- `${type}:${discogsId}`, e.g. 'artist:5230271'
  type       text not null check (type in ('artist','label')),
  discogs_id text not null,
  data       jsonb not null,
  cached_at  timestamptz not null default now()
);

create index if not exists discogs_node_cache_cached_at_idx on public.discogs_node_cache (cached_at);

alter table public.discogs_node_cache enable row level security;

drop policy if exists "discogs_node_cache_select" on public.discogs_node_cache;
create policy "discogs_node_cache_select" on public.discogs_node_cache
  for select to authenticated using (true);

drop policy if exists "discogs_node_cache_insert" on public.discogs_node_cache;
create policy "discogs_node_cache_insert" on public.discogs_node_cache
  for insert to authenticated with check (true);

-- Needed (unlike the YT tables) because a fetch can refine the same row
-- more than once as background enrichment (correlated artists, missing
-- cover art) settles after the initial write, and because a stale/
-- version-mismatched row gets refreshed in place rather than duplicated.
drop policy if exists "discogs_node_cache_update" on public.discogs_node_cache;
create policy "discogs_node_cache_update" on public.discogs_node_cache
  for update to authenticated using (true) with check (true);

-- ============================================================
-- WaxTree — Shared YouTube video-match cache
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor.
--
-- The YouTube Data API key backing /api/yt-search is a single
-- server-side key shared by every WaxTree user, capped at Google's
-- default 10,000 units/day (~99 fresh searches at 101 units each).
-- Without sharing results across users, every person who explores the
-- same artist/release re-burns that same tight quota rediscovering a
-- video someone else already found. track_id (Discogs release id +
-- tracklist position) and the normalized artist/label names used as
-- keys here are globally stable, not per-user, so a match confirmed by
-- one person is exactly as valid for anyone else who reaches the same
-- track. Once found, a match is treated as permanent (mirrors the
-- client's own non-expiring wt-yt-matches/wt-yt-channels cache) — first
-- writer wins, no update path.
-- ============================================================

create table if not exists public.yt_video_matches (
  track_id   text primary key,
  video_id   text, -- null = confirmed no matching video found
  matched_at timestamptz not null default now()
);

alter table public.yt_video_matches enable row level security;

create policy "yt_video_matches_select" on public.yt_video_matches
  for select to authenticated using (true);
create policy "yt_video_matches_insert" on public.yt_video_matches
  for insert to authenticated with check (true);

create table if not exists public.yt_channel_matches (
  name_norm  text primary key, -- normalized artist or label name
  channel_id text not null,
  matched_at timestamptz not null default now()
);

alter table public.yt_channel_matches enable row level security;

create policy "yt_channel_matches_select" on public.yt_channel_matches
  for select to authenticated using (true);
create policy "yt_channel_matches_insert" on public.yt_channel_matches
  for insert to authenticated with check (true);

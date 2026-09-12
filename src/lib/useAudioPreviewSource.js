import { useEffect } from 'react';

// Shared by TrackRow (a track inside its own release, full context) and
// QueueRow (a track pulled out into a playlist/likes list, best-effort
// context reconstructed from the track object alone) — same priority
// chain either way, one place to fix when it's wrong instead of two
// copies drifting apart. See TrackRow's own history for why this order:
//   0. Bandcamp (track.bcMp3) — the artist's own official stream, beats
//      everything else outright.
//   1. Deezer — a 30s preview in our own <audio> player, zero YouTube
//      quota. Tried even when a Discogs video is already known; that
//      video becomes a "full track" shortcut in the mini-player instead.
//   2. YouTube — Discogs-embedded videoId, else an API search, only once
//      Deezer has definitively come up empty.
//   3. Record stores — Hard Wax -> Yoyaku -> Deejay.de -> Clone.nl.
export const useAudioPreviewSource = (track, ctx, actions) => {
  const { artist, labelNameForSearch, releaseArtist, releaseTitle, releaseLabel, catno, trackIndex, releaseTrackCount, hardwaxUrl } = ctx;

  const bcMp3 = track.bcMp3 || null;
  const deezerRelease = !bcMp3 ? actions.getDeezerRelease(releaseArtist, releaseTitle, catno, releaseLabel) : null;
  const deezerId = deezerRelease ? actions.matchDeezerTrack(deezerRelease.tracks, track.title, trackIndex, releaseTrackCount) : null;
  // With a Bandcamp stream in hand, OR while Deezer is still resolving,
  // OR once Deezer has matched — nothing below runs. No YouTube search
  // fires until every earlier source has definitively come up empty.
  const deezerBlocks = !!bcMp3 || deezerRelease === undefined || !!deezerId;

  // A raw Discogs videoId only counts once it's known to actually play —
  // one that already failed (embedding disabled, or gone) is exactly as
  // "no video" as never having had one.
  const discogsVideo = track.videoId && !actions.isNoEmbedVideo(track.videoId) ? track.videoId : null;
  useEffect(() => {
    if (!deezerBlocks && !discogsVideo) actions.getTrackVideo(track, artist, labelNameForSearch);
  }, [actions, artist, deezerBlocks, discogsVideo, labelNameForSearch, track]);
  const resolvedVideo = deezerBlocks ? null : (actions.getTrackVideo(track, artist, labelNameForSearch) || null);

  const hardwaxPreview = !deezerBlocks && !resolvedVideo ? actions.getHardwaxAudioPreview(hardwaxUrl, track.id, track.title) : null;
  const yoyakuRelease = !deezerBlocks && !resolvedVideo && !hardwaxPreview ? actions.getYoyakuRelease(releaseArtist, releaseTitle, catno) : null;
  const yoyakuPreview = yoyakuRelease ? actions.matchYoyakuTrack(yoyakuRelease.tracks, track.id, track.title) : null;
  const deejayRelease = !deezerBlocks && !resolvedVideo && !hardwaxPreview && !yoyakuPreview ? actions.getDeejayRelease(releaseArtist, releaseTitle, catno) : null;
  const deejayPreview = deejayRelease ? actions.matchDeejayTrack(deejayRelease.tracks, track.id, track.title) : null;
  const cloneRelease = !deezerBlocks && !resolvedVideo && !hardwaxPreview && !yoyakuPreview && !deejayPreview ? actions.getCloneRelease(releaseArtist, releaseTitle, catno, releaseLabel) : null;
  const clonePreview = cloneRelease ? actions.matchCloneTrack(cloneRelease.tracks, track.id, track.title) : null;

  // What the single Play button does. `source` on a store preview still
  // rides through to AudioPreviewControls (it decides proxy vs direct
  // playback) but is never surfaced to the user.
  const audioPreview =
    bcMp3 ? { kind: 'store', mp3Url: bcMp3, source: 'bandcamp' } :
    deezerId ? { kind: 'deezer', deezerId } :
    hardwaxPreview ? { kind: 'store', mp3Url: hardwaxPreview, source: 'hardwax' } :
    yoyakuPreview ? { kind: 'store', mp3Url: yoyakuPreview, source: 'yoyaku' } :
    deejayPreview ? { kind: 'store', mp3Url: deejayPreview, source: 'deejay' } :
    clonePreview ? { kind: 'store', mp3Url: clonePreview, source: 'clone' } : null;

  const playBest = () => {
    if (audioPreview?.kind === 'deezer') { actions.playDeezerPreview(track.id, audioPreview.deezerId, track.title, artist); return; }
    if (audioPreview?.kind === 'store') { actions.playAudioPreview(track.id, audioPreview.mp3Url, track.title, artist, audioPreview.source); return; }
    // No preview source (yet) — play a video if one is known, else this
    // routes into the "search on YouTube" flow. `discogsVideo` covers the
    // brief window where Deezer is still resolving on a track that also
    // has an embedded video.
    actions.doPlay(track.id, resolvedVideo || discogsVideo, track.title, artist);
  };
  const hasPlayable = !!resolvedVideo || !!audioPreview || !!discogsVideo;

  return { audioPreview, resolvedVideo, discogsVideo, hasPlayable, playBest };
};

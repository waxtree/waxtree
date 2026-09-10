import { ChevronDown, Headphones, Heart, Play, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlaylistDrop } from '@/components/waxtree/PlaylistDrop';
import { useDismiss } from '@/lib/useDismiss';

export const TrackRow = ({ track, node, isLabel, primaryArtist, state, actions, playlistOpen, setPlaylistOpen, hardwaxUrl, releaseArtist, releaseTitle, releaseLabel, catno, trackIndex, releaseTrackCount }) => {
  const artist = isLabel ? track.label : (track.trackArtistName || track.releaseArtistName || node.name);
  const [helpOpen, setHelpOpen] = useState(false);
  const playlistRef = useDismiss(playlistOpen, () => setPlaylistOpen(false));
  const helpRef = useDismiss(helpOpen, () => setHelpOpen(false));

  // Playback source resolution, in priority order:
  //   0. Bandcamp — the artist's OWN official full-length stream, present
  //      only on bcArtist/bcLabel nodes and the "only on Bandcamp"
  //      supplement (track.bcMp3). Beats everything else outright — it IS
  //      the canonical audio for that track.
  //   1. Deezer  — a 30-second preview in our own <audio> player, zero
  //      YouTube quota. Tried before YouTube, even when a Discogs video
  //      exists — that video becomes a "full track" shortcut in the
  //      mini-player (see RightPanel) instead of the primary playback.
  //   2. YouTube — the Discogs-embedded videoId, else an API search, but
  //      only once Deezer has come up empty (a Deezer hit spends no
  //      search quota at all — getTrackVideo isn't even called).
  //   3. Record stores — Hard Wax → Yoyaku → Deejay.de → Clone.nl, each
  //      only consulted once every source before it also came up empty.
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
    if (!deezerBlocks && !discogsVideo) actions.getTrackVideo(track, artist, isLabel ? node.name : track.label);
  }, [actions, artist, deezerBlocks, discogsVideo, isLabel, node.name, track]);
  const resolvedVideo = deezerBlocks ? null : (actions.getTrackVideo(track, artist, isLabel ? node.name : track.label) || null);

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

  const liked = !!state.likes[track.id];
  const queued = state.dasAscoltare.some(item => item.id === track.id);
  const trackWithArtist = { ...track, artistName: artist };
  const owned = actions.isOwned(track.title, artist, track.duration);
  const featuring = primaryArtist && track.label && track.label !== primaryArtist
    ? track.label.split(',').map(value => value.trim()).filter(value => value && actions.normalizeStr(value) !== actions.normalizeStr(primaryArtist))
    : [];

  return (
    <div className="relative flex min-w-0 items-center gap-[6px]">
      {/* One Play button per row. It plays the best available source
          (Deezer preview → Discogs/YouTube video → store preview); the
          icon is a headphone when that turns out to be a short audio
          preview, a triangle for a full video or the "search YouTube"
          fallback. Explicit border on both states — the "off" state
          (text-muted-foreground on the same bg as every other state)
          reads as visually absent otherwise, since only the icon fill
          ever carried on/off here. */}
      <button
        type="button"
        onClick={playBest}
        title={audioPreview ? 'Play preview' : (resolvedVideo || discogsVideo) ? 'Play' : 'Search on YouTube'}
        className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-background transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground ${hasPlayable ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
      >
        {audioPreview ? <Headphones className="size-3" /> : <Play className="size-2.5 fill-current" />}
      </button>
      <span className="min-w-0 flex-[0_1_auto] truncate text-[12.5px] font-medium">{track.title}</span>
      {featuring.length > 0 && <span className="max-w-28 shrink-0 truncate text-[11px] italic text-muted-foreground/70">with {featuring.join(', ')}</span>}
      {track.duration && <span className="min-w-[26px] shrink-0 text-right text-[11px] text-muted-foreground/70">{track.duration}</span>}
      <button type="button" title="Like" onClick={() => actions.toggleLike(track.id)} className={`flex shrink-0 items-center justify-center transition hover:scale-[1.15] ${liked ? 'text-primary' : 'text-muted-foreground/70'}`}>
        <Heart className={`size-3.5 ${liked ? 'fill-current' : ''}`} />
      </button>
      <div ref={playlistRef} className="relative flex shrink-0 items-center">
        <button type="button" title="Add to playlist" onClick={() => setPlaylistOpen(!playlistOpen)} className={`flex items-center justify-center transition hover:scale-[1.1] ${queued ? 'text-primary' : 'text-muted-foreground/70'}`}>
          <Tag className="size-3.5" />
        </button>
        {playlistOpen && <PlaylistDrop track={trackWithArtist} node={node} state={state} actions={actions} onClose={() => setPlaylistOpen(false)} />}
      </div>
      {!resolvedVideo && !discogsVideo && (
        <div ref={helpRef} className="relative shrink-0">
          <button type="button" title="No video found" onClick={() => setHelpOpen(value => !value)} className="flex shrink-0 items-center rounded-[5px] border border-border px-[5px] py-px text-muted-foreground/70 transition-colors hover:border-primary hover:text-primary">
            <ChevronDown className="size-3" />
          </button>
          {helpOpen && (
            <div className="absolute right-0 top-full z-50 min-w-[180px] overflow-hidden rounded-[10px] border border-border bg-card shadow-[var(--wt-shadow)]">
              <button type="button" onClick={() => { actions.mutateState(value => { value.listens[track.id] = { badged: true }; }); setHelpOpen(false); }} className="block w-full px-3 py-2 text-left hover:bg-muted">✓ Mark as Listened</button>
              <button
                type="button"
                onClick={() => {
                  const input = prompt(`Paste the YouTube link for "${track.title}":`, '');
                  const id = actions.parseYoutubeUrlInput(input);
                  if (!id) { if (input) alert("That doesn't look like a valid YouTube link."); return; }
                  actions.submitYoutubeLink(track.id, id);
                  setHelpOpen(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-muted"
              >
                Help us with the link
              </button>
            </div>
          )}
        </div>
      )}
      {owned && <span className="shrink-0 whitespace-nowrap rounded border border-[rgba(155,107,255,.35)] bg-[rgba(155,107,255,.12)] px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-[#9B6BFF]">In your digital library</span>}
      {actions.inDiscogsCollection(track) && <span className="shrink-0 whitespace-nowrap rounded border border-[rgba(232,160,74,.35)] bg-[rgba(232,160,74,.12)] px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-[#E8A04A]">In collection</span>}
      {actions.inDiscogsWantlist(track) && <span className="shrink-0 whitespace-nowrap rounded border border-[rgba(74,138,255,.3)] bg-[rgba(74,138,255,.12)] px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-[#4A8AFF]">On Discogs' Wantlist</span>}
      {state.listens[track.id]?.badged && <span className="shrink-0 rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-primary">✓ listened</span>}
      {track.bpm && <span className="shrink-0 whitespace-nowrap rounded-lg border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground/70">{track.bpm} BPM</span>}
    </div>
  );
};

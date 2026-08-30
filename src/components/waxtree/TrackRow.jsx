import { ChevronDown, Heart, Play, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlaylistDrop } from '@/components/waxtree/PlaylistDrop';

export const TrackRow = ({ track, node, isLabel, primaryArtist, state, actions, playlistOpen, setPlaylistOpen }) => {
  const artist = isLabel ? track.label : (track.trackArtistName || track.releaseArtistName || node.name);
  const [helpOpen, setHelpOpen] = useState(false);
  // A raw Discogs videoId only counts here once it's known to actually
  // play — one that already failed (embedding disabled, or gone) is
  // exactly as "no video" as never having had one, and getTrackVideo
  // itself now falls through to the auto-match search for either case.
  const videoId = track.videoId && !actions.isNoEmbedVideo(track.videoId) ? track.videoId : null;
  useEffect(() => { if (!videoId) actions.getTrackVideo(track, artist, isLabel ? node.name : track.label); }, [actions, artist, isLabel, node.name, track, videoId]);
  const resolvedVideo = actions.getTrackVideo(track, artist, isLabel ? node.name : track.label) || null;
  const liked = !!state.likes[track.id];
  const queued = state.dasAscoltare.some(item => item.id === track.id);
  const trackWithArtist = { ...track, artistName: artist };
  const owned = actions.isOwned(track.title, artist, track.duration);
  const featuring = primaryArtist && track.label && track.label !== primaryArtist
    ? track.label.split(',').map(value => value.trim()).filter(value => value && actions.normalizeStr(value) !== actions.normalizeStr(primaryArtist))
    : [];

  return (
    <div className="relative flex min-w-0 items-center gap-[6px]">
      <button
        type="button"
        onClick={() => actions.doPlay(track.id, resolvedVideo, track.title, artist)}
        title={resolvedVideo ? 'Play' : 'Search on YouTube'}
        className={`flex size-[22px] shrink-0 items-center justify-center rounded-full bg-background transition-colors hover:bg-primary hover:text-primary-foreground ${resolvedVideo ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <Play className="size-2.5 fill-current" />
      </button>
      <span className="min-w-0 flex-[0_1_auto] truncate text-[12.5px] font-medium">{track.title}</span>
      {featuring.length > 0 && <span className="max-w-28 shrink-0 truncate text-[11px] italic text-muted-foreground/70">with {featuring.join(', ')}</span>}
      {track.duration && <span className="min-w-[26px] shrink-0 text-right text-[11px] text-muted-foreground/70">{track.duration}</span>}
      <button type="button" title="Like" onClick={() => actions.toggleLike(track.id)} className={`flex shrink-0 items-center justify-center transition hover:scale-[1.15] ${liked ? 'text-primary' : 'text-muted-foreground/70'}`}>
        <Heart className={`size-3.5 ${liked ? 'fill-current' : ''}`} />
      </button>
      <div className="relative flex shrink-0 items-center">
        <button type="button" title="Add to playlist" onClick={() => setPlaylistOpen(!playlistOpen)} className={`flex items-center justify-center transition hover:scale-[1.1] ${queued ? 'text-primary' : 'text-muted-foreground/70'}`}>
          <Tag className="size-3.5" />
        </button>
        {playlistOpen && <PlaylistDrop track={trackWithArtist} node={node} state={state} actions={actions} onClose={() => setPlaylistOpen(false)} />}
      </div>
      {!resolvedVideo && (
        <div className="relative shrink-0">
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

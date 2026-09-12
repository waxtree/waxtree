import { ArrowUpRight, Headphones, ListMusic, Play } from 'lucide-react';
import { useState } from 'react';
import { PlaylistDrop } from '@/components/waxtree/PlaylistDrop';
import { StoreButton } from '@/components/waxtree/StoreButton';
import { useAudioPreviewSource } from '@/lib/useAudioPreviewSource';

export const QueueRow = ({ track, state, actions, onRemove, showMove }) => {
  const [moveOpen, setMoveOpen] = useState(false);
  const artist = track.artistName || track.trackArtistName || track.releaseArtistName || '';
  const label = track.label || '';
  // Same proactive "light up once a direct match is already confirmed"
  // treatment ReleaseCard's own StoreButton row gets — searched by THIS
  // exact track's own title, not a release/album title, since a queue row
  // already IS one specific track (same distinction the old BuyMenu's
  // resolveStoreUrl call only made on click, never before). No findBcMatch
  // here (unlike ReleaseCard) — that needs a tree node's own bulk-fetched
  // catalog cache, which a queued track picked up outside its original
  // node (Related Tracks, a different session) can't reliably assume;
  // getBandcampDirect's own proactive per-title search doesn't need one.
  const bandcampDirect = actions.getBandcampDirect(artist, label, track.title);
  const beatportDirect = actions.getBeatportDirect(artist, label, track.title);

  // A queued track (playlist, Likes) has already been pulled out of its
  // original release's sibling context — no node, no isLabel, no other
  // tracks to know its own position among. Best-effort reconstruction
  // from the track object's own fields (buildTrackEntries already stores
  // all of these on every Discogs-sourced track) rather than the exact
  // values ReleaseCard/TrackRow compute from a live release group:
  // releaseTrackCount/trackIndex are left unknown, which only disables
  // Deezer's position tiebreak for an ambiguous near-duplicate-title pair
  // — exact/fuzzy title matching (the common case) still runs fully.
  const releaseArtist = track.releaseArtistName || track.trackArtistName || artist;
  const hardwax = actions.getHardwaxComment(releaseArtist, track.album || track.title, track.catno);
  const { audioPreview, resolvedVideo, discogsVideo, hasPlayable, playBest } = useAudioPreviewSource(track, {
    artist,
    labelNameForSearch: label,
    releaseArtist, releaseTitle: track.album || track.title, releaseLabel: label, catno: track.catno,
    trackIndex: null, releaseTrackCount: null, hardwaxUrl: hardwax?.url,
  }, actions);

  return (
    <div className="flex items-center gap-2.5 border-b border-border py-2">
      {track.thumbUrl ? <img className="size-10 rounded-lg object-cover" src={track.thumbUrl} alt="" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">♫</div>}
      <div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{track.title}</strong><span className="block truncate text-[11px] text-muted-foreground">{[track.artistName, track.year, track.label].filter(Boolean).join(' · ')}</span></div>
      <button
        type="button"
        onClick={playBest}
        title={audioPreview ? 'Play preview' : (resolvedVideo || discogsVideo) ? 'Play' : 'Search on YouTube'}
        className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-background transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground ${hasPlayable ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
      >
        {audioPreview ? <Headphones className="size-3" /> : <Play className="size-2.5 fill-current" />}
      </button>
      {showMove && (
        <div className="relative flex items-center">
          <button type="button" title="Add to another playlist" onClick={() => setMoveOpen(value => !value)} className="text-muted-foreground/70 hover:text-primary">
            <ListMusic className="size-3.5" />
          </button>
          {moveOpen && <PlaylistDrop track={track} state={state} actions={actions} onClose={() => setMoveOpen(false)} />}
        </div>
      )}
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <StoreButton source="bc" directUrl={bandcampDirect} releaseTitle={track.title} artist={artist} label={label} isLabel={false} actions={actions} />
        <StoreButton source="bp" directUrl={beatportDirect} releaseTitle={track.title} artist={artist} label={label} isLabel={false} actions={actions} />
        {track.discogsUrl && (
          <a href={track.discogsUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-[20px] border-[1.5px] border-border px-[11px] py-[5px] text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            Discogs<ArrowUpRight className="size-3" />
          </a>
        )}
      </div>
      <button type="button" onClick={onRemove} className="text-base text-muted-foreground/70 hover:text-destructive">×</button>
    </div>
  );
};

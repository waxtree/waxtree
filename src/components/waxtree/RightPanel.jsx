import { ArrowUpRight, ChevronDown, Heart, SkipBack, SkipForward, Tag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlaylistDrop } from '@/components/waxtree/PlaylistDrop';
import { RelatedCard } from '@/components/waxtree/RelatedCard';
import { YtCustomControls } from '@/components/waxtree/YtCustomControls';
import { buttonSecondary } from '@/lib/waxtreeUi';

export const RightPanel = ({ state, actions }) => {
  const related = actions.getRelatedView();
  const playing = state.nowPlaying;
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  useEffect(() => { if (playing) actions.syncYtPlayer(); }, [actions, playing?.trackId, playing?.videoId]);
  useEffect(() => { setPlaylistOpen(false); setExploreOpen(false); }, [playing?.trackId]);
  const fullTrack = playing ? actions.findTrack(playing.trackId) : null;
  const context = playing ? actions.findTrackContext(playing.trackId) : null;
  const exploreTargets = playing ? actions.getExploreTargets(playing.trackId, playing.artistName) : [];
  const queued = playing && state.dasAscoltare.some(track => track.id === playing.trackId);
  const playerTrack = playing ? { ...fullTrack, id: playing.trackId, title: playing.title, artistName: playing.artistName, videoId: playing.videoId, thumbUrl: fullTrack?.thumbUrl } : null;
  const fallbackUrl = playing ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${playing.artistName} ${playing.title}`)}` : '';
  const openTarget = target => { actions.addNode(target.type, target.id, target.name, null, state.activeBranchId); setExploreOpen(false); };
  const liked = playing && !!state.likes[playing.trackId];
  // Below sm this whole panel used to just be display:none (max-[900px]:
  // hidden, same rule that also drops it for tablet widths) — including
  // the div the YouTube player itself attaches to (#yt-iframe-host,
  // synced in the effect above), so pressing play looked like it did
  // nothing at all: there was nowhere for the player to mount. Now it
  // becomes a small fixed bottom bar instead of disappearing, but ONLY
  // while something is actually playing — Related Tracks stays out
  // (still too wide a feature for this size screen for now, per explicit
  // request) and so does tablet's existing hidden-regardless-of-playing
  // behavior (untouched: max-sm is a narrower range than max-[900px], so
  // this override never reaches into the 640–899px tier).
  // display:none (from max-[900px]:hidden above) beats a plain max-sm:fixed
  // otherwise — position and display are independent properties, so
  // switching position alone doesn't bring it back on screen; !flex is
  // the one override that actually needs !important here.
  const mobilePlayerBar = playing ? 'max-sm:!flex max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:z-40 max-sm:max-h-[70vh] max-sm:w-full max-sm:border-l-0 max-sm:border-t max-sm:pb-[env(safe-area-inset-bottom)] max-sm:shadow-[0_-4px_16px_rgba(0,0,0,.18)]' : '';

  return (
    <aside id="right-panel" className={`flex min-h-0 flex-col border-l border-border bg-card max-[900px]:hidden ${mobilePlayerBar}`}>
      {!playing ? (
        <div className="px-3 py-[18px] text-center text-xs text-muted-foreground/70">▶&nbsp;&nbsp;Nothing playing</div>
      ) : (
        <div className="shrink-0 border-b border-border">
          <div className="px-3 py-2.5">
            <strong className="block text-[13px]">{playing.title}</strong>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{playing.artistName}</span>
          </div>
          {playing.videoId && !state.ytError ? (
            <>
              <div className="aspect-video w-full bg-black max-sm:mx-auto max-sm:w-[220px]"><div id="yt-iframe-host" className="h-full w-full" /></div>
              {/* The full-width desktop panel has room for this extra
                  scrub-bar overlay; the mobile bar is deliberately just
                  the essentials (see this component's own top comment). */}
              {playing.fromDiscogs && <div className="max-sm:hidden"><YtCustomControls key={playing.trackId} trackId={playing.trackId} actions={actions} /></div>}
            </>
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-secondary p-4 text-center max-sm:aspect-auto max-sm:py-3">
              <p className="text-xs text-muted-foreground">{state.ytError?.message || 'No video in Discogs data'}</p>
              <a className={`${buttonSecondary} inline-flex items-center gap-0.5`} href={state.ytError?.url || fallbackUrl} target="_blank" rel="noreferrer">{(state.ytError?.linkText || 'Search on YouTube ↗').replace(' ↗', '')}<ArrowUpRight className="size-3" /></a>
            </div>
          )}
          <div className="flex items-center gap-1.5 p-2.5">
            <button type="button" title="Previous" onClick={() => actions.playAdjacentTrack(-1)} className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground"><SkipBack className="size-3.5" /></button>
            <button type="button" title="Next" onClick={() => actions.playAdjacentTrack(1)} className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground"><SkipForward className="size-3.5" /></button>
            <button type="button" title="Like" onClick={() => actions.toggleLike(playing.trackId)} className={`flex items-center justify-center ${liked ? 'text-primary' : 'text-muted-foreground/70'}`}>
              <Heart className={`size-4 ${liked ? 'fill-current' : ''}`} />
            </button>
            <div className="relative flex items-center">
              <button type="button" title="Add to playlist" onClick={() => setPlaylistOpen(value => !value)} className={`flex items-center justify-center ${queued ? 'text-primary' : 'text-muted-foreground/70'}`}>
                <Tag className="size-4" />
              </button>
              {playlistOpen && <PlaylistDrop track={playerTrack} node={context?.node} state={state} actions={actions} onClose={() => setPlaylistOpen(false)} />}
            </div>
            {exploreTargets.length === 1 && <button type="button" onClick={() => openTarget(exploreTargets[0])} className="ml-auto text-[10px] text-primary">Explore</button>}
            {exploreTargets.length > 1 && (
              <div className="relative ml-auto">
                <button type="button" onClick={() => setExploreOpen(value => !value)} className="flex items-center gap-0.5 text-[10px] text-primary">Explore <ChevronDown className="size-3" /></button>
                {exploreOpen && (
                  <div className="absolute right-0 top-full z-50 min-w-[170px] overflow-hidden rounded-lg border border-border bg-card shadow-[var(--wt-shadow)]">
                    {exploreTargets.map(target => <button key={`${target.type}-${target.id}`} type="button" onClick={() => openTarget(target)} className="block w-full px-3 py-2 text-left text-xs hover:bg-muted">Explore {target.type}</button>)}
                  </div>
                )}
              </div>
            )}
            <button type="button" title="Stop" onClick={actions.stopPlay} className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground"><X className="size-3.5" /></button>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 max-sm:hidden">
        <span className="mb-2 block border-b border-border pb-2 text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">Related Tracks</span>
        {related.cards.length ? related.cards.map(card => <RelatedCard key={card.playId} card={card} state={state} actions={actions} />) : <span className="mt-6 block text-center text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground/70 opacity-50">{related.status}</span>}
      </div>
    </aside>
  );
};

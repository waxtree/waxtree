import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StoreButton } from '@/components/waxtree/StoreButton';
import { TrackRow } from '@/components/waxtree/TrackRow';
import { buttonSecondary } from '@/lib/waxtreeUi';

const PAGE_SIZE = 20;

export const BandcampOnlyResults = ({ node, isLabel, state, actions }) => {
  const bcOnly = actions.getBandcampOnly(node.id);
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(bcOnly.releases.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  // Every visible row auto-resolves a YouTube video on mount (TrackRow's
  // own effect, same as everywhere else in the app) — a prolific artist's
  // self-released catalog can put 50-70+ releases in this list, and
  // showing them all at once would fire that many YouTube searches in one
  // shot. Paginating keeps only the visible page's rows mounted, same
  // reasoning as NodeDetails' own 50-per-page track list.
  const pageReleases = bcOnly.releases.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [node.id]);

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">Only on Bandcamp ({bcOnly.releases.length})</p>
        <button type="button" onClick={() => actions.mutateState(value => { value.bandcampOnlyView[node.id] = false; })} className={`${buttonSecondary} gap-1`}>
          <ArrowLeft className="size-3" /> Back to Discogs tracks
        </button>
      </div>
      <p className="mb-3 text-[11.5px] leading-5 text-muted-foreground/70">
        Releases on {node.name}'s Bandcamp page with no confident match in their Discogs catalog. Title matching is heuristic, not exact — false positives can happen.
      </p>
      {bcOnly.status === 'loading' && <div className="py-8 text-center text-xs text-muted-foreground/70">Checking Bandcamp catalog…</div>}
      {bcOnly.status === 'error' && <div className="py-8 text-center text-xs text-muted-foreground/70">Couldn't check Bandcamp right now.</div>}
      {bcOnly.status === 'done' && bcOnly.releases.length === 0 && (
        <div className="py-8 text-center text-xs text-muted-foreground/70">Nothing found — every Bandcamp release matched something already on Discogs.</div>
      )}
      <div className="flex flex-col gap-[6px]">
        {pageReleases.map(track => (
          <div key={track.id} className="flex items-center gap-3 rounded-[10px] border border-border bg-card px-[14px] py-[10px]">
            <div className="min-w-0 flex-1">
              <TrackRow
                track={track}
                node={node}
                isLabel={isLabel}
                primaryArtist={null}
                state={state}
                actions={actions}
                playlistOpen={openPlaylist === track.id}
                setPlaylistOpen={open => setOpenPlaylist(open ? track.id : null)}
              />
            </div>
            <StoreButton source="bc" directUrl={track.bcUrl} releaseTitle={track.title} artist={isLabel ? track.label : node.name} label={isLabel ? node.name : null} isLabel={isLabel} actions={actions} />
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button type="button" disabled={safePage === 0} onClick={() => setPage(value => value - 1)} className={`${buttonSecondary} disabled:opacity-30`}>← Prev</button>
          <span className="text-xs text-muted-foreground">Page {safePage + 1} / {totalPages}</span>
          <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(value => value + 1)} className={`${buttonSecondary} disabled:opacity-30`}>Next →</button>
        </div>
      )}
    </div>
  );
};

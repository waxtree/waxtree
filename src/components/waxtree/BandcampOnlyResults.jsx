import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { StoreButton } from '@/components/waxtree/StoreButton';
import { TrackRow } from '@/components/waxtree/TrackRow';
import { buttonSecondary } from '@/lib/waxtreeUi';

export const BandcampOnlyResults = ({ node, isLabel, state, actions }) => {
  const bcOnly = actions.getBandcampOnly(node.id);
  const [openPlaylist, setOpenPlaylist] = useState(null);

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
        {bcOnly.releases.map(track => (
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
    </div>
  );
};

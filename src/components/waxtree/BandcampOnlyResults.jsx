import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StoreButton } from '@/components/waxtree/StoreButton';
import { TrackRow } from '@/components/waxtree/TrackRow';
import { buttonSecondary } from '@/lib/waxtreeUi';

// Smaller than a normal track-list page (NodeDetails uses 50, the old flat
// version of this used 20) — each entry here now expands into its real
// tracklist (see fetchBcOnlyReleaseDetails' own comment), so a page can
// mean dozens of fresh YouTube lookups rather than one per row. Keeping
// the page small keeps that under the user's own control instead of
// firing all at once.
const PAGE_SIZE = 6;

export const BandcampOnlyResults = ({ node, isLabel, state, actions }) => {
  const bcOnly = actions.getBandcampOnly(node.id);
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(bcOnly.releases.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageReleases = bcOnly.releases.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [node.id]);
  useEffect(() => { if (pageReleases.length) void actions.fetchBcOnlyReleaseDetails(pageReleases); }, [actions, pageReleases]);

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
        {pageReleases.map(release => {
          const detail = actions.getBcOnlyReleaseDetail(release.bcUrl);
          // detail.tracks — the release's real tracklist once loaded; falls
          // back to the single release-title placeholder while loading, on
          // error, or if the page genuinely had none (a lone single/track
          // page still round-trips through here with one entry).
          const tracks = detail?.tracks?.length ? detail.tracks : [release];
          return (
            <article key={release.id} className="flex items-start gap-3 rounded-[10px] border border-border bg-card px-[14px] py-[10px] transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]">
              {release.thumbUrl ? (
                <img className="size-10 shrink-0 rounded-[6px] border border-border object-cover" src={release.thumbUrl} alt="" loading="lazy" />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[6px] border border-border bg-secondary text-[17px] text-muted-foreground/70">♫</div>
              )}
              <div className="w-[200px] min-w-0 flex-[0_1_200px] pt-0.5">
                <h3 className="truncate text-sm font-bold">{release.title}</h3>
                {isLabel && release.label && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{release.label}</p>}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                {detail?.loading && <p className="text-[11px] italic text-muted-foreground/70">Loading tracklist…</p>}
                {tracks.map(track => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    node={node}
                    isLabel={isLabel}
                    primaryArtist={null}
                    state={state}
                    actions={actions}
                    playlistOpen={openPlaylist === track.id}
                    setPlaylistOpen={open => setOpenPlaylist(open ? track.id : null)}
                  />
                ))}
              </div>
              <div className="shrink-0 pt-0.5">
                <StoreButton source="bc" directUrl={release.bcUrl} releaseTitle={release.title} artist={isLabel ? release.label : node.name} label={isLabel ? node.name : null} isLabel={isLabel} actions={actions} />
              </div>
            </article>
          );
        })}
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

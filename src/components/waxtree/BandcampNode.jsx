import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ArtistIcon } from '@/components/waxtree/icons/ArtistIcon';
import { LabelIcon } from '@/components/waxtree/icons/LabelIcon';
import { PlantLoader } from '@/components/waxtree/PlantLoader';
import { StoreButton } from '@/components/waxtree/StoreButton';
import { TrackRow } from '@/components/waxtree/TrackRow';
import { buttonSecondary } from '@/lib/waxtreeUi';

// Each release expands into its real tracklist on first sight (see the
// engine's fetchBcOnlyReleaseDetails) — kept small so opening a page
// doesn't fire a whole prolific catalog's detail fetches at once.
const PAGE_SIZE = 10;

// A node whose artist/label isn't in Discogs at all — its whole content
// comes from that act's own Bandcamp page. Discogs stays WaxTree's
// primary catalog; this is the supplement (see searchBandcamp /
// addBandcampNode in the engine). Renders its own header + release grid
// rather than going through the Discogs-shaped Content/NodeDetails path.
export const BandcampNode = ({ node, state, actions }) => {
  const data = node.data;
  const isLabel = node.type === 'bcLabel';
  const releases = data?.releases || [];
  // Same identity toggleFollow itself uses for a Bandcamp node (no
  // discogsId to key off) — the Bandcamp URL, params first since that
  // survives a reload before data has re-loaded.
  const bcUrl = node.params?.bcUrl || data?.bandUrl || null;
  const followed = state.follows.some(item => item.type === node.type && item.bc_url === bcUrl);
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(releases.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageReleases = releases.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [node.id]);
  useEffect(() => { if (pageReleases.length) void actions.fetchBcOnlyReleaseDetails(pageReleases); }, [actions, pageReleases]);

  return (
    <main className="min-w-0 overflow-y-auto px-7 pb-28 pt-7 max-sm:px-3.5 max-sm:pb-56">
      <div className="mb-5 flex items-center gap-4">
        {data?.imageUrl ? (
          <img className="size-20 shrink-0 rounded-2xl border border-border object-cover max-sm:size-14" src={data.imageUrl} alt={node.name} />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary text-muted-foreground max-sm:size-14">{isLabel ? <LabelIcon className="size-8" /> : <ArtistIcon className="size-8" />}</div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[28px] font-bold leading-tight max-sm:text-xl">{node.name}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
            <span>{isLabel ? 'Label' : 'Artist'}{data ? ` · ${data.trackCount} releases` : ''}</span>
            <span className="rounded border border-border bg-secondary px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">Bandcamp · not on Discogs</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => actions.toggleFollow(node)}
          className={`shrink-0 rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${followed ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
        >
          {followed ? '✓ Following' : '+ Follow'}
        </button>
        {data?.bandUrl && (
          <a href={data.bandUrl} target="_blank" rel="noreferrer" className={`${buttonSecondary} inline-flex shrink-0 items-center gap-0.5`}>
            Bandcamp <ArrowUpRight className="size-3" />
          </a>
        )}
      </div>

      {node.loading && <PlantLoader />}
      {node.error && (
        <div className="flex flex-col items-center gap-3 px-7 py-12 text-center">
          <div className="text-4xl">🌱</div>
          <strong>{node.error}</strong>
          <button type="button" className={buttonSecondary} onClick={() => actions.retryNode(node.id)}>Try again</button>
        </div>
      )}
      {data && !node.loading && !node.error && releases.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground/70">No releases found on this Bandcamp page.</div>
      )}

      {data && !node.loading && !node.error && releases.length > 0 && (
        <>
          <div className="flex flex-col gap-[6px]">
            {pageReleases.map(release => {
              const detail = actions.getBcOnlyReleaseDetail(release.bcUrl);
              const tracks = detail?.tracks?.length ? detail.tracks : [release];
              return (
                <article key={release.id} className="flex items-start gap-3 rounded-[10px] border border-border bg-card px-[14px] py-[10px] transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] max-sm:flex-wrap">
                  {release.thumbUrl ? (
                    <img className="size-10 shrink-0 rounded-[6px] border border-border object-cover" src={release.thumbUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[6px] border border-border bg-secondary text-[17px] text-muted-foreground/70">♫</div>
                  )}
                  <div className="w-[200px] min-w-0 flex-[0_1_200px] pt-0.5 max-sm:w-auto max-sm:flex-1">
                    <h3 className="truncate text-sm font-bold">{release.title}</h3>
                    {isLabel && release.label && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{release.label}</p>}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-[5px] max-sm:basis-full">
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
                  <div className="shrink-0 pt-0.5 max-sm:basis-full">
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
        </>
      )}
    </main>
  );
};

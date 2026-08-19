import { useEffect, useState } from 'react';
import { ReleaseCard } from '@/components/waxtree/ReleaseCard';
import { buttonSecondary } from '@/lib/waxtreeUi';

const PAGE_SIZE = 15;

export const GenreYearResults = ({ node, state, actions }) => {
  const results = node.data?.results || [];
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageResults = results.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  // Scoped to this genre/year search rather than reusing groupTracksByRelease's
  // own title+label key — that one needs a release's full detail already
  // loaded to compute, which would mean waiting on every release's fetch
  // just to decide which section to put it in. "Listened" here is tracked
  // per Discogs release id instead, independent of whatever key the same
  // release might use if opened normally from its artist/label page.
  const isListened = release => state.alreadyListened.includes('gy-' + release.id);
  const notListened = pageResults.filter(release => !isListened(release));
  const listened = pageResults.filter(isListened);

  useEffect(() => { setPage(0); }, [node.id]);
  // Only the current page's releases get their real tracklist fetched —
  // fetchGenreYearReleaseDetails no-ops on anything already cached, so
  // paging back to an earlier page is instant.
  useEffect(() => {
    const ids = results.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE).map(release => release.id);
    if (ids.length) actions.fetchGenreYearReleaseDetails(ids);
  }, [actions, node.data, safePage]);

  const renderRelease = release => {
    const detail = actions.getGenreYearReleaseDetail(release.id);
    if (!detail || detail.loading) {
      return (
        <div key={release.id} className="flex items-center gap-3 rounded-[10px] border border-border bg-card px-[14px] py-[10px] text-xs text-muted-foreground">
          <span className="block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading {release.title}…
        </div>
      );
    }
    if (detail.err || !detail.tracks.length) return null;
    const group = { key: 'gy-' + release.id, tracks: detail.tracks };
    const syntheticNode = { id: null, name: detail.tracks[0].releaseArtistName || release.label || 'Various', branchId: state.activeBranchId };
    return <ReleaseCard key={release.id} group={group} node={syntheticNode} isLabel={false} state={state} actions={actions} />;
  };

  return (
    <main className="min-w-0 overflow-y-auto px-7 pb-28 pt-7">
      <h1 className="mb-1 truncate text-[26px] font-bold">{node.name}</h1>
      <p className="mb-4 text-[13px] text-muted-foreground">Discogs releases matching this genre/style and year</p>
      {node.loading && <div className="py-12 text-center text-sm text-muted-foreground">Searching Discogs…</div>}
      {node.error && (
        <div className="flex flex-col items-center gap-3 px-7 py-12 text-center">
          <div className="text-4xl">🌱</div>
          <strong>{node.error}</strong>
          <button type="button" className={buttonSecondary} onClick={() => actions.retryGenreYearNode(node.id)}>Try again</button>
        </div>
      )}
      {node.loaded && !node.loading && !node.error && (
        results.length ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">RELEASES ({results.length} Discogs)</p>
            <div className="mt-3 flex flex-col gap-[6px]">
              {notListened.length ? notListened.map(renderRelease) : <div className="py-8 text-center text-xs text-muted-foreground/70">All releases on this page are marked Already Listened.</div>}
            </div>
            {listened.length > 0 && (
              <section className="mt-8 border-t border-border pt-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">ALREADY LISTENED</p>
                <div className="flex flex-col gap-[6px]">{listened.map(renderRelease)}</div>
              </section>
            )}
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <button type="button" disabled={safePage === 0} onClick={() => setPage(value => value - 1)} className={`${buttonSecondary} disabled:opacity-30`}>← Prev</button>
                <span className="text-xs text-muted-foreground">Page {safePage + 1} / {totalPages}</span>
                <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(value => value + 1)} className={`${buttonSecondary} disabled:opacity-30`}>Next →</button>
              </div>
            )}
          </>
        ) : <div className="py-12 text-center text-sm text-muted-foreground/70">No releases found for that combination.</div>
      )}
    </main>
  );
};

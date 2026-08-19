import { GenreYearResultCard } from '@/components/waxtree/GenreYearResultCard';
import { buttonSecondary } from '@/lib/waxtreeUi';

export const GenreYearResults = ({ node, actions }) => {
  const results = node.data?.results || [];

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
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">{results.length} release{results.length > 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 gap-1.5 min-[900px]:grid-cols-2">
              {results.map(release => <GenreYearResultCard key={release.id} release={release} actions={actions} />)}
            </div>
            {results.length >= 300 && <p className="mt-4 text-center text-xs text-muted-foreground/70">Showing the first {results.length} matches — narrow your styles/years for more precise results.</p>}
          </>
        ) : <div className="py-12 text-center text-sm text-muted-foreground/70">No releases found for that combination.</div>
      )}
    </main>
  );
};

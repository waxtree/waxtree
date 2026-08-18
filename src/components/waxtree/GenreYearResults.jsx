import { ArrowUpRight } from 'lucide-react';
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
            <div className="grid grid-cols-2 gap-3 min-[1100px]:grid-cols-3">
              {results.map(release => (
                <button key={release.id} type="button" onClick={() => actions.pickResult(release)} className="flex items-center gap-3 rounded-[10px] border border-border bg-card p-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]">
                  {release.thumb ? <img className="size-12 shrink-0 rounded-[6px] border border-border object-cover" src={release.thumb} alt="" loading="lazy" /> : <div className="flex size-12 shrink-0 items-center justify-center rounded-[6px] border border-border bg-secondary text-[17px] text-muted-foreground/70">♫</div>}
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-[13px]">{release.title}</strong>
                    <span className="block truncate text-[11px] text-muted-foreground">{[release.label, release.year].filter(Boolean).join(' · ')}</span>
                    {release.genre && <span className="mt-1 inline-block rounded-full border border-primary/30 px-1.5 py-px text-[10px] text-primary">{release.genre}</span>}
                  </div>
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/70" />
                </button>
              ))}
            </div>
            {results.length >= 90 && <p className="mt-4 text-center text-xs text-muted-foreground/70">Showing the first {results.length} matches — narrow your styles/years for more precise results.</p>}
          </>
        ) : <div className="py-12 text-center text-sm text-muted-foreground/70">No releases found for that combination.</div>
      )}
    </main>
  );
};

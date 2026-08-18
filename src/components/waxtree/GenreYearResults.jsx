import { ArrowUpRight } from 'lucide-react';

export const GenreYearResults = ({ state, actions }) => {
  const results = state.genreYearResults || [];
  const summary = [state.exploreGenres.join(', '), [...state.exploreYears].sort((a, b) => a - b).join(', ')].filter(Boolean).join(' · ');
  const openResult = release => {
    actions.mutateState(value => { value.genreYearResults = null; value.exploreMode = 'search'; });
    actions.pickResult(release);
  };

  return (
    <main className="min-w-0 overflow-y-auto px-7 pb-28 pt-7">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-[22px] font-bold">Explore by Genre / Year</h1>
        <button type="button" onClick={() => actions.mutateState(value => { value.genreYearResults = null; value.genreYearErr = ''; })} className="text-xs text-muted-foreground hover:text-primary">Clear</button>
      </div>
      <p className="mb-4 text-[13px] text-muted-foreground">{summary || 'All releases'}</p>
      {state.genreYearLoading && <div className="py-12 text-center text-sm text-muted-foreground">Searching Discogs…</div>}
      {state.genreYearErr && <div className="py-12 text-center text-sm text-destructive">{state.genreYearErr}</div>}
      {!state.genreYearLoading && !state.genreYearErr && (
        results.length ? (
          <>
            <div className="grid grid-cols-2 gap-3 min-[1100px]:grid-cols-3">
              {results.map(release => (
                <button key={release.id} type="button" onClick={() => openResult(release)} className="flex items-center gap-3 rounded-[10px] border border-border bg-card p-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]">
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
            {results.length >= 90 && <p className="mt-4 text-center text-xs text-muted-foreground/70">Showing the first {results.length} matches — narrow your genres/years for more precise results.</p>}
          </>
        ) : <div className="py-12 text-center text-sm text-muted-foreground/70">No releases found for that combination.</div>
      )}
    </main>
  );
};

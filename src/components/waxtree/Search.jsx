import { ChevronDown, Search as SearchIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { GenreYearPicker } from '@/components/waxtree/GenreYearPicker';

export const Search = ({ state, actions }) => {
  const timer = useRef(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const update = event => {
    const query = event.target.value;
    actions.mutateState(value => { value.q = query; if (!query.trim()) { value.results = []; value.err = ''; } });
    clearTimeout(timer.current);
    if (query.trim()) timer.current = setTimeout(actions.liveSearchTick, 300);
  };
  const isTextMode = state.exploreMode === 'search';
  const showResults = isTextMode && (state.loading || state.err || state.results.length > 0);

  return (
    <div className="group relative min-w-0 shrink grow-[10] basis-0 max-w-[540px]">
      <div className="flex items-center gap-2 rounded-full border-[1.5px] border-border bg-background px-3.5 py-1.5 transition focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(94,196,123,.12)]">
        <div className="relative shrink-0">
          <button type="button" onClick={() => setModeMenuOpen(value => !value)} className="flex items-center gap-0.5 rounded-full border border-primary px-2 py-px text-[10px] text-primary">
            Explore<ChevronDown className="size-2.5" />
          </button>
          {modeMenuOpen && (
            <div className="absolute left-0 top-[calc(100%+4px)] z-[310] min-w-[190px] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-[var(--wt-shadow)]">
              <button type="button" onClick={() => { actions.mutateState(value => { value.exploreMode = 'search'; }); setModeMenuOpen(false); }} className={`block w-full rounded-md px-2.5 py-1.5 text-left text-[12px] hover:bg-muted ${isTextMode ? 'text-primary' : ''}`}>By Artist / Label / Track</button>
              <button type="button" onClick={() => { actions.mutateState(value => { value.exploreMode = 'genreYear'; }); setModeMenuOpen(false); }} className={`block w-full rounded-md px-2.5 py-1.5 text-left text-[12px] hover:bg-muted ${!isTextMode ? 'text-primary' : ''}`}>By Genre / Year</button>
            </div>
          )}
        </div>
        {isTextMode ? (
          <>
            <input
              value={state.q}
              onChange={update}
              onKeyDown={event => { if (event.key === 'Enter') actions.doSearch(); if (event.key === 'Escape') actions.mutateState(value => { value.results = []; value.err = ''; }); }}
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
              placeholder="Search artist, label, or track..."
            />
            <button type="button" title="Search" aria-label="Search" onClick={actions.doSearch} className="shrink-0 text-muted-foreground/70 hover:text-primary">
              <SearchIcon className="size-3.5" />
            </button>
          </>
        ) : (
          <GenreYearPicker state={state} actions={actions} />
        )}
      </div>
      {showResults && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[300] max-h-[280px] overflow-y-auto rounded-xl border border-border bg-card shadow-[var(--wt-shadow)]">
          {state.loading && <div className="px-3.5 py-3 text-[13px] italic text-muted-foreground">Searching...</div>}
          {state.err && <div className="px-3.5 py-3 text-[13px] italic text-accent">{state.err}</div>}
          {!state.loading && state.results.slice(0, 14).map(result => (
            <button key={`${result.type}-${result.id}`} type="button" onClick={() => actions.pickResult(result)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-muted">
              <div className="relative size-9 shrink-0">
                {result.thumb ? <img className="size-9 rounded-[7px] border border-border object-cover" src={result.thumb} alt="" /> : <div className="flex size-9 items-center justify-center rounded-[7px] border border-border bg-secondary">{result.type === 'label' ? '🎵' : result.type === 'release' ? '💿' : '🎤'}</div>}
                <span className="absolute -bottom-1 -right-1 rounded bg-primary px-1 text-[8px] font-bold text-primary-foreground">{result.type === 'release' ? 'Rel.' : result.type === 'label' ? 'Label' : 'Art.'}</span>
              </div>
              <span>
                <span className="block text-[13px] font-medium">{result.title}</span>
                <span className="block text-[11px] text-muted-foreground">{result.type === 'release' ? [result.label, result.year].filter(Boolean).join(' · ') || 'Release' : result.type === 'label' ? 'Label' : 'Artist'}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {isTextMode && !showResults && state.chips.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[300] hidden max-h-[280px] w-max min-w-full max-w-[540px] overflow-y-auto rounded-xl border border-border bg-card p-2.5 shadow-[var(--wt-shadow)] group-hover:block group-focus-within:block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground/70">Recent Searches</span>
          <div className="flex flex-wrap gap-1.5">
            {state.chips.map(chip => {
              // Legacy chips saved before this change are bare strings —
              // treat those as plain search chips by default, same as
              // before. But a genre/year search still in the tree is
              // findable by name regardless of the chip's own shape, so
              // that check always runs first — otherwise a chip saved
              // before this fix (or any chip whose text happens to match
              // an existing genreYear node) would still route through the
              // wrong, plain-text path even though the real node is right
              // there. Confirmed live 2026-08-24: a pre-existing "Dub, Deep
              // House, 2012" chip kept opening as a text search after this
              // fix shipped, purely because that chip predated it.
              const isGenreYear = typeof chip === 'object' && chip.type === 'genreYear';
              const name = typeof chip === 'string' ? chip : chip.name;
              const handleClick = () => {
                const existingGenreYearNode = state.nodes.find(node => node.type === 'genreYear' && node.name === name);
                if (existingGenreYearNode) { actions.selectNode(existingGenreYearNode.id); return; }
                if (isGenreYear) { actions.addGenreYearNode(chip.styles || [], chip.years || []); return; }
                // Legacy chip AND the node it came from is gone too (deleted,
                // or never survived a save from before params were kept) —
                // last resort: reconstruct styles/years from the chip's own
                // display name rather than silently misrouting to a text
                // search that can't possibly match a query like this.
                const parsed = typeof chip === 'string' ? actions.parseGenreYearChipName(name) : null;
                if (parsed) { actions.addGenreYearNode(parsed.styles, parsed.years); return; }
                const existing = state.nodes.find(node => node.name === name);
                if (existing) actions.selectNode(existing.id);
                else actions.mutateState(value => { value.q = name; actions.doSearch(); });
              };
              return (
                <button
                  key={name}
                  type="button"
                  onClick={handleClick}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground hover:border-primary"
                >
                  <span>{name}</span>
                  <span onClick={event => { event.stopPropagation(); actions.removeChip(name); }} className="text-muted-foreground/70">×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

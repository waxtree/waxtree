import { Search as SearchIcon } from 'lucide-react';
import { useRef } from 'react';

export const Search = ({ state, actions }) => {
  const activeBranch = actions.getBranch(state.activeBranchId);
  const timer = useRef(null);
  const update = event => {
    const query = event.target.value;
    actions.mutateState(value => { value.q = query; if (!query.trim()) { value.results = []; value.err = ''; } });
    clearTimeout(timer.current);
    if (query.trim()) timer.current = setTimeout(actions.liveSearchTick, 300);
  };
  const showResults = state.loading || state.err || state.results.length > 0;

  return (
    <div className="group relative min-w-0 flex-1 max-w-[360px]">
      <div className="flex items-center gap-2 rounded-full border-[1.5px] border-border bg-background px-3.5 py-1.5 transition focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(94,196,123,.12)]">
        {activeBranch && <span className="shrink-0 rounded-full border border-primary px-2 py-px text-[10px] text-primary">{activeBranch.name}</span>}
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
      {!showResults && state.chips.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[300] hidden max-h-[280px] w-max min-w-full max-w-[420px] overflow-y-auto rounded-xl border border-border bg-card p-2.5 shadow-[var(--wt-shadow)] group-hover:block group-focus-within:block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground/70">Recent Searches</span>
          <div className="flex flex-wrap gap-1.5">
            {state.chips.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => { const existing = state.nodes.find(node => node.name === name); if (existing) actions.selectNode(existing.id); else actions.mutateState(value => { value.q = name; actions.doSearch(); }); }}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground hover:border-primary"
              >
                <span>{name}</span>
                <span onClick={event => { event.stopPropagation(); actions.removeChip(name); }} className="text-muted-foreground/70">×</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

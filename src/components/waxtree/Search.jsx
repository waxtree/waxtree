import { Search as SearchIcon } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';

export const Search = ({ state, actions }) => {
  const activeBranch = actions.getBranch(state.activeBranchId);
  const timer = useRef(null);
  const update = event => {
    const query = event.target.value;
    actions.mutateState(value => { value.q = query; if (!query.trim()) { value.results = []; value.err = ''; } });
    clearTimeout(timer.current);
    if (query.trim()) timer.current = setTimeout(actions.liveSearchTick, 300);
  };

  return (
    <div className="group relative shrink-0 border-b border-border bg-background">
      <div className="flex gap-2.5 px-[18px] py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-4 py-2 transition focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(94,196,123,.12)]">
          <SearchIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
          {activeBranch && <span className="shrink-0 rounded-full border border-primary px-2 py-px text-[10px] text-primary">{activeBranch.name}</span>}
          <input
            value={state.q}
            onChange={update}
            onKeyDown={event => { if (event.key === 'Enter') actions.doSearch(); if (event.key === 'Escape') actions.mutateState(value => { value.results = []; value.err = ''; }); }}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
            placeholder="Search artist, label, or track..."
          />
        </div>
        <Button className="rounded-full px-[18px] py-2 text-[13px] font-semibold" onClick={actions.doSearch}>Search</Button>
      </div>
      {(state.loading || state.err || state.results.length > 0) && (
        <div className="absolute left-[18px] right-[18px] top-[calc(100%-2px)] z-[300] max-h-[280px] overflow-y-auto rounded-b-xl border border-t-0 border-border bg-card shadow-[var(--wt-shadow)]">
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
      {state.chips.length > 0 && (
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-h-[60px] group-hover:opacity-100 group-focus-within:max-h-[60px] group-focus-within:opacity-100">
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border px-[18px] py-2">
            <span className="mr-2 shrink-0 text-[10px] font-bold uppercase text-muted-foreground/70">Recent Searches</span>
            {state.chips.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => { const existing = state.nodes.find(node => node.name === name); if (existing) actions.selectNode(existing.id); else actions.mutateState(value => { value.q = name; actions.doSearch(); }); }}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary"
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

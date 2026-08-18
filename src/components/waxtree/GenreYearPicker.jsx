import { X } from 'lucide-react';
import { useState } from 'react';
import { buttonPrimary } from '@/lib/waxtreeUi';

export const GenreYearPicker = ({ state, actions }) => {
  const [open, setOpen] = useState(false);
  const [yearInput, setYearInput] = useState('');
  const styles = state.exploreStyles;
  const years = state.exploreYears;
  // Mirrors toggleExploreStyle/addExploreYear's own block condition exactly
  // (one more of this dimension vs. the OTHER dimension's current count,
  // floored at 1 for "no filter on that axis yet") — so the control
  // disables at the same instant the action would actually be rejected,
  // not a step early or late.
  const atStyleCap = (styles.length + 1) * Math.max(years.length, 1) > actions.exploreGenreYearMaxCombos;
  const atYearCap = Math.max(styles.length, 1) * (years.length + 1) > actions.exploreGenreYearMaxCombos;
  const summary = [styles.length && `${styles.length} style${styles.length > 1 ? 's' : ''}`, years.length && `${years.length} year${years.length > 1 ? 's' : ''}`].filter(Boolean).join(', ');
  const addYear = () => {
    if (yearInput.trim()) actions.addExploreYear(yearInput.trim());
    setYearInput('');
  };
  // A year typed but not yet confirmed with Enter would otherwise be
  // silently dropped by Search — either because the click landed before
  // addExploreYear's state update had actually committed (years read here
  // would still be the pre-update value), or simply because the user never
  // pressed Enter at all. Folding any pending text in directly, rather
  // than trusting state.exploreYears to already reflect it, fixes both.
  const runSearch = () => {
    const pending = parseInt(yearInput.trim(), 10);
    const finalYears = pending && !years.includes(pending) ? [...years, pending] : years;
    actions.addGenreYearNode(styles, finalYears);
    setYearInput('');
    setOpen(false);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <button type="button" onClick={() => setOpen(value => !value)} className="w-full truncate text-left text-[13px] text-muted-foreground">{summary || 'Electronic — select style & year…'}</button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[300] w-max min-w-full max-w-[380px] rounded-xl border border-border bg-card p-3 shadow-[var(--wt-shadow)]">
          <div className="mb-3">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground/70">Genre</span>
            <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[12px] text-primary">Electronic</span>
          </div>
          <div className="mb-3">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground/70">Style</span>
            <select
              value=""
              disabled={atStyleCap}
              onChange={event => { if (event.target.value) actions.toggleExploreStyle(event.target.value); }}
              className="w-full rounded-full border border-border bg-secondary px-2.5 py-1 text-[12px] outline-none disabled:opacity-50"
            >
              <option value="">{atStyleCap ? 'Combination limit reached' : 'Add a style…'}</option>
              {actions.exploreStyles.filter(style => !styles.includes(style)).map(style => <option key={style} value={style}>{style}</option>)}
            </select>
            {styles.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {styles.map(style => (
                  <span key={style} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                    {style}<button type="button" onClick={() => actions.toggleExploreStyle(style)}><X className="size-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mb-3">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground/70">Year</span>
            <input
              type="number"
              value={yearInput}
              onChange={event => setYearInput(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addYear(); } }}
              disabled={atYearCap}
              placeholder={atYearCap ? 'Combination limit reached' : 'Type a year, press Enter…'}
              className="w-full rounded-full border border-border bg-secondary px-2.5 py-1 text-[12px] outline-none disabled:opacity-50"
            />
            {years.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {years.map(year => (
                  <span key={year} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                    {year}<button type="button" onClick={() => actions.removeExploreYear(year)}><X className="size-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={styles.length === 0 && years.length === 0 && !yearInput.trim()}
            onClick={runSearch}
            className={`${buttonPrimary} w-full py-1.5 disabled:opacity-40`}
          >
            Search
          </button>
        </div>
      )}
    </div>
  );
};

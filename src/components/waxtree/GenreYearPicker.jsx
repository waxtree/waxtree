import { X } from 'lucide-react';
import { useState } from 'react';
import { buttonPrimary } from '@/lib/waxtreeUi';

export const GenreYearPicker = ({ state, actions }) => {
  const [open, setOpen] = useState(false);
  const [yearInput, setYearInput] = useState('');
  const genres = state.exploreGenres;
  const years = state.exploreYears;
  // Mirrors toggleExploreGenre/addExploreYear's own block condition exactly
  // (one more of this dimension vs. the OTHER dimension's current count,
  // floored at 1 for "no filter on that axis yet") — so the control
  // disables at the same instant the action would actually be rejected,
  // not a step early or late.
  const atGenreCap = (genres.length + 1) * Math.max(years.length, 1) > actions.exploreGenreYearMaxCombos;
  const atYearCap = Math.max(genres.length, 1) * (years.length + 1) > actions.exploreGenreYearMaxCombos;
  const canSearch = (genres.length > 0 || years.length > 0) && !state.genreYearLoading;
  const summary = [genres.length && `${genres.length} genre${genres.length > 1 ? 's' : ''}`, years.length && `${years.length} year${years.length > 1 ? 's' : ''}`].filter(Boolean).join(', ');
  const addYear = () => {
    if (yearInput.trim()) actions.addExploreYear(yearInput.trim());
    setYearInput('');
  };

  return (
    <div className="relative min-w-0 flex-1">
      <button type="button" onClick={() => setOpen(value => !value)} className="w-full truncate text-left text-[13px] text-muted-foreground">{summary || 'Select genre & year…'}</button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[300] w-max min-w-full max-w-[380px] rounded-xl border border-border bg-card p-3 shadow-[var(--wt-shadow)]">
          <div className="mb-3">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-muted-foreground/70">Genre</span>
            <select
              value=""
              disabled={atGenreCap}
              onChange={event => { if (event.target.value) actions.toggleExploreGenre(event.target.value); }}
              className="w-full rounded-full border border-border bg-secondary px-2.5 py-1 text-[12px] outline-none disabled:opacity-50"
            >
              <option value="">{atGenreCap ? 'Combination limit reached' : 'Add a genre…'}</option>
              {actions.exploreGenres.filter(genre => !genres.includes(genre)).map(genre => <option key={genre} value={genre}>{genre}</option>)}
            </select>
            {genres.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {genres.map(genre => (
                  <span key={genre} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                    {genre}<button type="button" onClick={() => actions.toggleExploreGenre(genre)}><X className="size-2.5" /></button>
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
          <button type="button" disabled={!canSearch} onClick={() => { actions.searchByGenreYear(); setOpen(false); }} className={`${buttonPrimary} w-full py-1.5 disabled:opacity-40`}>
            {state.genreYearLoading ? 'Searching…' : 'Search'}
          </button>
        </div>
      )}
    </div>
  );
};

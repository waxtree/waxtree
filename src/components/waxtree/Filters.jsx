import { Input } from '@/components/ui/input';

export const Filters = ({ state, genres, resultCount, actions, onResetPage }) => {
  const update = mutator => { actions.mutateState(mutator); onResetPage(); };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-card p-2.5">
      <Input
        value={state.filterTitle}
        onChange={event => update(value => { value.filterTitle = event.target.value; })}
        className="h-auto min-w-[150px] flex-1 rounded-full px-3 py-1.5 text-xs"
        placeholder="Search title..."
      />
      <select value={state.filterSort} onChange={event => update(value => { value.filterSort = event.target.value; })} className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs">
        <option value="default">Default order</option>
        <option value="antichrono">Newest first</option>
        <option value="chrono">Oldest first</option>
        <option value="az">A → Z</option>
        <option value="za">Z → A</option>
        <option value="genre">By style</option>
      </select>
      <select value={state.filterFormat} onChange={event => update(value => { value.filterFormat = event.target.value; })} className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs">
        <option value="all">All formats</option>
        <option value="digital">Digital only</option>
        <option value="vinyl">Vinyl only</option>
      </select>
      {genres.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {genres.map(genre => (
            <button
              key={genre}
              type="button"
              onClick={() => update(value => { value.filterGenres = value.filterGenres.includes(genre) ? value.filterGenres.filter(item => item !== genre) : [...value.filterGenres, genre]; })}
              className={`rounded-full border px-2 py-1 text-[10px] ${state.filterGenres.includes(genre) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}
      <span className="text-[11px] text-muted-foreground/70">{resultCount} results</span>
      <button type="button" onClick={() => update(value => { value.filterTitle = ''; value.filterFormat = 'all'; value.filterSort = 'default'; value.filterGenres = []; })} className="text-[11px] text-primary">
        × Clear
      </button>
    </div>
  );
};

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FavoriteResultRow } from '@/components/onboarding/FavoriteResultRow';
import { bandcampFavorite, discogsFavorite, favoriteKey, hasFavorite } from '@/lib/favorites';

const SEARCH_DEBOUNCE_MS = 300;
const RELATED_DEBOUNCE_MS = 500;
const EMPTY_RESULTS = { discogs: [], bandcamp: [], discogsFailed: false };

// One search box over Discogs AND Bandcamp (for acts/labels Discogs doesn't
// list), the picks as removable chips, and "more like your picks" below.
// Used by both onboarding cards and the profile, so it sticks to the shadcn
// tokens only and works in either theme.
export const FavoritePicker = ({ kind, items, artistFavs, labelFavs, actions, onAdd, onRemove }) => {
  const noun = kind === 'label' ? 'label' : 'artist';
  const article = kind === 'label' ? 'a' : 'an';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [searching, setSearching] = useState(false);
  const [related, setRelated] = useState([]);
  const [resolving, setResolving] = useState('');
  const searchSeq = useRef(0);
  // Related picks are derived from BOTH lists, so either changing — even
  // swapping one pick for another — has to refresh them.
  const picksSignature = [...artistFavs, ...labelFavs].map(favoriteKey).join('|');

  useEffect(() => {
    const text = query.trim();
    const seq = ++searchSeq.current;
    if (!text) {
      setResults(EMPTY_RESULTS);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await actions.searchFavoriteCandidates(text, kind);
      if (seq !== searchSeq.current) return;
      setResults(found);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, kind, actions]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      actions.getRelatedFavorites(kind, artistFavs, labelFavs)
        .then(names => { if (active) setRelated(names); })
        .catch(() => {});
    }, RELATED_DEBOUNCE_MS);
    return () => { active = false; clearTimeout(timer); };
  }, [kind, picksSignature, actions]);

  const add = favorite => {
    onAdd(favorite);
    setQuery('');
  };

  // A suggestion is only a name: resolve it to a real Discogs pick, or fall
  // back to dropping it in the search box so the person can choose.
  const addRelated = async name => {
    setResolving(name);
    const found = await actions.resolveFavoriteByName(name, kind);
    setResolving('');
    if (found) onAdd(discogsFavorite(found));
    else setQuery(name);
  };

  const hasResults = results.discogs.length > 0 || results.bandcamp.length > 0;
  const showPanel = query.trim() !== '';

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape') setQuery(''); }}
          aria-label={`Search for ${article} ${noun}`}
          placeholder={`Search for ${article} ${noun}…`}
          className="w-full rounded-xl border-[1.5px] border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
        />
        {showPanel && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg">
            {results.discogs.length > 0 && <span className="block px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">On Discogs</span>}
            {results.discogs.slice(0, 6).map(result => (
              <FavoriteResultRow
                key={`d${result.id}`}
                thumb={result.thumb}
                title={result.title}
                source="Discogs"
                added={hasFavorite(items, discogsFavorite(result))}
                onAdd={() => add(discogsFavorite(result))}
              />
            ))}
            {results.discogsFailed && <p className="px-3 py-2 text-[11px] text-destructive">Discogs didn't respond — try again in a moment.</p>}
            {results.bandcamp.length > 0 && <span className="block px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">On Bandcamp</span>}
            {results.bandcamp.slice(0, 5).map(result => (
              <FavoriteResultRow
                key={result.id}
                thumb={result.thumb}
                title={result.title}
                source="Bandcamp"
                detail={[result.location, result.genre].filter(Boolean).join(' · ')}
                added={hasFavorite(items, bandcampFavorite(result))}
                onAdd={() => add(bandcampFavorite(result))}
              />
            ))}
            {!hasResults && !results.discogsFailed && <p className="px-3 py-3 text-xs text-muted-foreground">{searching ? 'Searching…' : `No ${noun} found for "${query.trim()}".`}</p>}
            {hasResults && searching && <p className="px-3 py-2 text-[11px] text-muted-foreground">Still searching…</p>}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label={`Your favourite ${noun}s`}>
          {items.map(item => (
            <li key={favoriteKey(item)} className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 py-1 pl-3 pr-1.5 text-[13px] font-medium text-foreground">
              {item.name}
              {item.source === 'bandcamp' && <span className="rounded-full bg-card px-1.5 text-[9px] uppercase text-muted-foreground">Bandcamp</span>}
              <button type="button" onClick={() => onRemove(item)} aria-label={`Remove ${item.name}`} className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary hover:text-primary-foreground">
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {related.length > 0 && (
        <div className="mt-6">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Related to your picks</span>
          <div className="flex flex-wrap gap-2">
            {related.map(name => (
              <button
                key={name}
                type="button"
                disabled={resolving === name}
                onClick={() => addRelated(name)}
                className="rounded-full border border-border bg-card px-3 py-1 text-[13px] text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

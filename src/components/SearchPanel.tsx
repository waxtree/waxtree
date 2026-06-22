import { useState, useRef, useEffect, useCallback } from 'react';
import { searchArtists } from '../api/discogs';
import { useStore } from '../store';
import type { DiscogsSearchResult } from '../types';

interface Props {
  branchId: string;
  onNodeAdded: (nodeId: string) => void;
}

export function SearchPanel({ branchId, onNodeAdded }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscogsSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [disambig, setDisambig] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const addRootNode = useStore(s => s.addRootNode);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true); setError('');
    try {
      const r = await searchArtists(q);
      setResults(r);
      if (r.length === 1) {
        pick(r[0]);
      } else if (r.length > 1) {
        setDisambig(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2) { setResults([]); setDisambig(false); return; }
    timerRef.current = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(timerRef.current);
  }, [query, doSearch]);

  const pick = (r: DiscogsSearchResult) => {
    const nodeId = addRootNode(branchId, 'artist', r.id, r.title);
    setQuery(''); setResults([]); setDisambig(false);
    onNodeAdded(nodeId);
  };

  const token = import.meta.env.VITE_DISCOGS_TOKEN as string;

  return (
    <>
      <div className="search-wrap">
        <div className="search-bar">
          <span className="search-bar__icon">🔍</span>
          <input
            ref={inputRef}
            className="search-bar__input"
            placeholder={token ? 'Cerca artista o label…' : '⚠ Aggiungi VITE_DISCOGS_TOKEN nel file .env'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setQuery('')}
            disabled={!token}
          />
          {query && <button className="search-bar__clear" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}>✕</button>}
        </div>

        {error && <div className="error-msg">{error}</div>}
        {loading && <div className="search-results"><div className="search-spinner">Ricerca in corso…</div></div>}
        {!loading && results.length > 0 && !disambig && (
          <div className="search-results">
            {results.slice(0, 5).map(r => (
              <div key={r.id} className="search-result" onClick={() => pick(r)}>
                {r.thumb
                  ? <img className="search-result__img" src={r.thumb} alt="" />
                  : <div className="search-result__img-ph">🎵</div>}
                <div>
                  <div className="search-result__name">{r.title}</div>
                  <div className="search-result__type">{r.type}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {disambig && results.length > 0 && (
        <DisambiguationDialog results={results} onPick={pick} onClose={() => { setDisambig(false); setResults([]); }} />
      )}
    </>
  );
}

function DisambiguationDialog({
  results,
  onPick,
  onClose,
}: {
  results: DiscogsSearchResult[];
  onPick: (r: DiscogsSearchResult) => void;
  onClose: () => void;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog__header">
          <span className="dialog__title">Scegli l'artista</span>
          <button className="dialog__close" onClick={onClose}>✕</button>
        </div>
        {results.map(r => (
          <div key={r.id} className="dialog__item" onClick={() => onPick(r)}>
            {r.thumb
              ? <img className="dialog__img" src={r.thumb} alt="" />
              : <div className="dialog__img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎵</div>}
            <div>
              <div className="dialog__name">{r.title}</div>
              {r.uri && <div className="dialog__sub">discogs.com{r.uri}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

// Same redirect path as the per-release Bandcamp/Beatport buttons
// (StoreButton, used on release cards / search results) — resolveStoreUrl
// is the one shared action both call, so a track bought from a playlist
// lands on the exact same verified/best-effort page a track bought from
// its own node would.
export const BuyMenu = ({ track, actions }) => {
  const [open, setOpen] = useState(false);
  const [loadingSource, setLoadingSource] = useState(null);
  const releaseTitle = track.album || track.title;
  const artist = track.artistName || track.trackArtistName || '';
  const label = track.label || '';

  const openStore = async source => {
    setOpen(false);
    const nextTab = window.open('about:blank', '_blank');
    setLoadingSource(source);
    const url = await actions.resolveStoreUrl(source, { isLabel: false, artist, label, title: releaseTitle });
    setLoadingSource(null);
    if (nextTab && !nextTab.closed) nextTab.location.href = url;
    else window.open(url, '_blank', 'noreferrer');
  };

  return (
    <div className="relative flex shrink-0 items-center">
      <button
        type="button"
        title="Buy"
        onClick={() => setOpen(value => !value)}
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${open ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
      >
        <ShoppingBag className="size-3" /> Buy
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[160px] overflow-hidden rounded-[10px] border border-border bg-card shadow-[var(--wt-shadow)]">
          <button type="button" disabled={loadingSource === 'bc'} onClick={() => openStore('bc')} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted disabled:opacity-50">
            Bandcamp {loadingSource === 'bc' ? '…' : <ArrowUpRight className="size-3" />}
          </button>
          <button type="button" disabled={loadingSource === 'bp'} onClick={() => openStore('bp')} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted disabled:opacity-50">
            Beatport {loadingSource === 'bp' ? '…' : <ArrowUpRight className="size-3" />}
          </button>
          {track.discogsUrl && (
            <a href={track.discogsUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-muted">
              Discogs <ArrowUpRight className="size-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

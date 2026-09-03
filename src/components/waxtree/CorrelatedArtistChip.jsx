import { useState } from 'react';
import { buttonSecondary } from '@/lib/waxtreeUi';

// correlatedArtists (see fetchArtistData in the engine) is built from a
// Discogs label-releases listing, which only ever returns a plain artist
// NAME per release — no id — so there's nothing to navigate to directly
// until a real Discogs artist search confirms one. That resolution
// happens here, on click, via exploreCorrelatedArtist — not proactively
// for every chip when the page loads, since that would be up to ~10
// extra Discogs searches per artist page visit for names a visitor may
// never click.
export const CorrelatedArtistChip = ({ name, node, actions }) => {
  const [status, setStatus] = useState('idle'); // idle | resolving | failed

  const handleClick = async () => {
    if (status === 'resolving') return;
    setStatus('resolving');
    const ok = await actions.exploreCorrelatedArtist(name, node.id, node.branchId);
    setStatus(ok ? 'idle' : 'failed');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'resolving'}
      title={status === 'failed' ? "Couldn't find a confirmed Discogs profile for this name" : undefined}
      className={`${buttonSecondary} ${status === 'failed' ? 'opacity-50' : ''}`}
    >
      {status === 'resolving' ? '…' : name}
    </button>
  );
};

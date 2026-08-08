import { useState } from 'react';

export const StoreButton = ({ source, directUrl, releaseTitle, artist, label, isLabel, actions }) => {
  const [loading, setLoading] = useState(false);
  const isBandcamp = source === 'bc';
  const open = async () => {
    if (directUrl) { window.open(directUrl, '_blank', 'noreferrer'); return; }
    const nextTab = window.open('about:blank', '_blank');
    setLoading(true);
    const url = await actions.resolveStoreUrl(source, { isLabel, artist, label, title: releaseTitle });
    setLoading(false);
    if (nextTab && !nextTab.closed) nextTab.location.href = url;
    else window.open(url, '_blank', 'noreferrer');
  };
  const sourceStyle = isBandcamp
    ? directUrl ? 'border-[rgba(29,160,195,.5)] text-[#1DA0C3] hover:border-[#1DA0C3] hover:bg-[rgba(29,160,195,.12)]' : 'border-border hover:border-[#1DA0C3] hover:text-[#1DA0C3]'
    : 'border-border hover:border-[#01E47C] hover:text-[#01E47C]';

  return (
    <button type="button" disabled={loading} onClick={open} className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-[20px] border-[1.5px] px-[11px] py-[5px] text-[11px] text-muted-foreground transition-colors disabled:opacity-50 ${sourceStyle}`}>
      {loading ? '…' : `${isBandcamp ? 'Bandcamp' : 'Beatport'} ↗`}
    </button>
  );
};

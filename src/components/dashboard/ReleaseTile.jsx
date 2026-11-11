import { Check } from 'lucide-react';

// One suggested record: cover, title, artist, year · label. Opens the release
// (tracklist with play / like / playlist / explore) right under its string.
export const ReleaseTile = ({ item, active, listened, onClick }) => {
  const meta = [item.year, item.label].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${item.artist ? `${item.artist} — ` : ''}${item.name}`}
      className={`group w-[148px] shrink-0 snap-start rounded-[10px] text-left transition-opacity max-sm:w-[132px] ${listened ? 'opacity-55 hover:opacity-100' : ''}`}
    >
      <span className={`relative block aspect-square overflow-hidden rounded-[10px] border bg-secondary transition-colors ${active ? 'border-primary ring-2 ring-primary/40' : 'border-border group-hover:border-primary/60'}`}>
        {item.thumb ? <img src={item.thumb} alt="" loading="lazy" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-3xl text-muted-foreground/60">♫</span>}
        {listened && <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
      </span>
      <span className="mt-2 block truncate text-[13px] font-semibold leading-tight">{item.name}</span>
      {item.artist && <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">{item.artist}</span>}
      {meta && <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground/70">{meta}</span>}
    </button>
  );
};

import { Check, Plus } from 'lucide-react';

export const FavoriteResultRow = ({ thumb, title, source, detail, added, onAdd }) => (
  <button
    type="button"
    disabled={added}
    onClick={onAdd}
    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/60 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
  >
    {thumb
      ? <img className="size-9 shrink-0 rounded-md object-cover" src={thumb} alt="" />
      : <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary" aria-hidden="true">♫</span>}
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="truncate text-[13px] font-medium text-foreground">{title}</span>
        <span className="shrink-0 rounded-full border border-border px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{source}</span>
      </span>
      {detail && <span className="block truncate text-[11px] text-muted-foreground">{detail}</span>}
    </span>
    {added ? <Check className="size-4 shrink-0 text-primary" aria-label="Added" /> : <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
  </button>
);

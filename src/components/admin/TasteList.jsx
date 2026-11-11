// One labelled list inside a user's taste profile (genres, favourites…).
export const TasteList = ({ label, items }) => (
  <div>
    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">{label}</span>
    {items.length ? <span className="text-[12.5px]">{items.join(', ')}</span> : <span className="text-[12.5px] text-muted-foreground/70">—</span>}
  </div>
);

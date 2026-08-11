import { ArtistIcon } from '@/components/waxtree/icons/ArtistIcon';
import { LabelIcon } from '@/components/waxtree/icons/LabelIcon';

export const RelatedEntities = ({ node, data, isLabel, actions }) => {
  const entries = isLabel
    ? [data.parentLabel && { ...data.parentLabel, prefix: '↑ ' }, ...(data.sublabels || []).slice(0, 6)].filter(Boolean)
    : (data.aliases || []).slice(0, 6);
  if (!entries.length) return null;

  return (
    <div className="mb-[18px] flex flex-wrap gap-1.5">
      {entries.map(entry => (
        <button
          key={`${entry.type}-${entry.id}`}
          type="button"
          onClick={() => actions.addNode(entry.type || (isLabel ? 'label' : 'artist'), entry.id, entry.name, node.id, node.branchId, { background: true })}
          className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
        >
          {entry.type === 'label' || isLabel ? <LabelIcon className="size-3" /> : <ArtistIcon className="size-3" />}{entry.prefix || ''}{entry.name} ›
        </button>
      ))}
    </div>
  );
};

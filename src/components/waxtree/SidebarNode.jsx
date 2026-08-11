import { Hash, Pin, X } from 'lucide-react';
import { useState } from 'react';
import { ArtistIcon } from '@/components/waxtree/icons/ArtistIcon';
import { LabelIcon } from '@/components/waxtree/icons/LabelIcon';
import { Badge } from '@/components/ui/badge';

export const SidebarNode = ({ node, depth, state, actions }) => {
  const active = node.id === state.selectedId;
  const [tagging, setTagging] = useState(false);
  const [tag, setTag] = useState('');

  return (
    <>
      <div
        draggable
        onDragStart={event => event.dataTransfer.setData('text/plain', node.id)}
        onClick={() => actions.selectNode(node.id)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={`group flex cursor-pointer items-start gap-1.5 border-l-2 py-[7px] pr-2.5 ${node.justAdded ? 'animate-pulse border-primary bg-primary/20' : active ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}`}
      >
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground/70">{node.type === 'label' ? <LabelIcon className="size-3.5" /> : <ArtistIcon className="size-3.5" />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {node.pinned && <span className="size-1.5 rounded-full bg-primary" />}
            <span className={`min-w-0 flex-1 truncate text-[12.5px] ${active ? 'font-semibold text-primary' : ''}`}>{node.name}</span>
            {node.loaded && actions.nodeFullyExplored(node) && <Badge className="shrink-0 gap-0.5 bg-primary/15 text-[9px] text-primary">✓ All Explored</Badge>}
          </div>
          {node.tags?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {node.tags.map(value => <span key={value} className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">#{value}</span>)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
          <button type="button" title="Pin" onClick={event => { event.stopPropagation(); actions.togglePin(node.id); }} className="text-muted-foreground hover:text-primary"><Pin className="size-3.5" /></button>
          <button type="button" title="Tag" onClick={event => { event.stopPropagation(); setTagging(value => !value); }} className="text-muted-foreground hover:text-primary"><Hash className="size-3.5" /></button>
          <button type="button" title="Remove" onClick={event => { event.stopPropagation(); actions.removeNode(node.id); }} className="text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button>
        </div>
      </div>
      {tagging && (
        <div style={{ paddingLeft: 30 + depth * 14 }} className="flex gap-1.5 px-2 pb-2">
          <input
            autoFocus
            value={tag}
            onChange={event => setTag(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') { actions.addTag(node.id, tag); setTag(''); setTagging(false); } }}
            className="min-w-0 flex-1 rounded-full border border-primary bg-secondary px-2 py-0.5 text-[11px] outline-none"
            placeholder="Tag..."
          />
        </div>
      )}
    </>
  );
};

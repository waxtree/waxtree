import { FolderInput, Hash, Pin, X } from 'lucide-react';
import { useState } from 'react';
import { ArtistIcon } from '@/components/waxtree/icons/ArtistIcon';
import { LabelIcon } from '@/components/waxtree/icons/LabelIcon';
import { Badge } from '@/components/ui/badge';

export const SidebarNode = ({ node, depth, state, actions }) => {
  const active = node.id === state.selectedId;
  const [tagging, setTagging] = useState(false);
  const [tag, setTag] = useState('');
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [dropEdge, setDropEdge] = useState(null);

  const handleDragOver = event => {
    event.preventDefault();
    // dataTransfer.getData() is unreadable during dragover in every
    // browser (only .types is, by design) — the dragged-vs-self check
    // has to wait until drop; harmless if the indicator briefly shows
    // while hovering a node over itself, since reorderNode no-ops on
    // draggedId === targetId anyway.
    const midpoint = event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2;
    setDropEdge(event.clientY < midpoint ? 'before' : 'after');
  };
  const handleDrop = event => {
    event.preventDefault();
    event.stopPropagation();
    const draggedId = event.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== node.id) actions.reorderNode(draggedId, node.id, dropEdge || 'before');
    setDropEdge(null);
  };

  return (
    <>
      <div
        draggable
        onDragStart={event => event.dataTransfer.setData('text/plain', node.id)}
        onDragEnd={() => setDropEdge(null)}
        onDragOver={handleDragOver}
        onDragLeave={() => setDropEdge(null)}
        onDrop={handleDrop}
        onClick={() => actions.selectNode(node.id)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={`group relative flex cursor-pointer items-start gap-1.5 border-l-2 py-[7px] pr-2.5 ${node.justAdded ? 'animate-pulse border-primary bg-primary/20' : active ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}`}
      >
        {dropEdge && <span className={`absolute inset-x-0 h-0.5 bg-primary ${dropEdge === 'before' ? 'top-0' : 'bottom-0'}`} />}
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
        <div className={`relative flex shrink-0 gap-1 ${branchMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button type="button" title="Pin" onClick={event => { event.stopPropagation(); actions.togglePin(node.id); }} className="text-muted-foreground hover:text-primary"><Pin className="size-3.5" /></button>
          <button type="button" title="Tag" onClick={event => { event.stopPropagation(); setTagging(value => !value); }} className="text-muted-foreground hover:text-primary"><Hash className="size-3.5" /></button>
          <button type="button" title="Move to branch" onClick={event => { event.stopPropagation(); setBranchMenuOpen(value => !value); }} className="text-muted-foreground hover:text-primary"><FolderInput className="size-3.5" /></button>
          <button type="button" title="Remove" onClick={event => { event.stopPropagation(); actions.removeNode(node.id); }} className="text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button>
          {branchMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+4px)] z-[400] min-w-[140px] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-[var(--wt-shadow)]" onClick={event => event.stopPropagation()}>
              {state.branches.filter(branch => branch.id !== node.branchId).map(branch => (
                <button key={branch.id} type="button" onClick={() => { actions.moveNodeToBranch(node.id, branch.id); setBranchMenuOpen(false); }} className="block w-full truncate rounded-md px-2.5 py-1.5 text-left text-[12px] hover:bg-muted">{branch.name}</button>
              ))}
              {state.branches.length <= 1 && <span className="block px-2.5 py-1.5 text-[11px] text-muted-foreground/70">No other branches</span>}
            </div>
          )}
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

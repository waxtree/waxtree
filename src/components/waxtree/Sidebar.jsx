import { SidebarNode } from '@/components/waxtree/SidebarNode';
import { Button } from '@/components/ui/button';
import { hScrollThin } from '@/lib/waxtreeUi';

export const Sidebar = ({ state, actions }) => {
  const allTags = [...new Set(state.nodes.flatMap(node => node.tags || []))].sort();
  const branchNodes = state.nodes.filter(node => node.branchId === state.activeBranchId);
  const filtered = state.sbFilterTag ? branchNodes.filter(node => node.tags?.includes(state.sbFilterTag)) : branchNodes;
  const children = parentId => filtered.filter(node => node.parentId === parentId).sort((a, b) => state.sbPinFirst ? Number(b.pinned) - Number(a.pinned) : 0);

  let shownNodes = 0;
  // Children render before (above) their own parent, which renders last
  // (at the bottom of its own block) — a parent is inherently "older" than
  // anything explored from it, same reasoning as the newest-node-on-top
  // sibling order, just applied to the parent/child axis too.
  const renderNodes = (parentId = null, depth = 0) => {
    const output = [];
    children(parentId).forEach(node => {
      if (!state.isPremium && shownNodes >= actions.freeNodeLimit) return;
      shownNodes += 1;
      output.push(...renderNodes(node.id, depth + 1));
      output.push(<SidebarNode key={node.id} node={node} depth={depth} state={state} actions={actions} />);
    });
    return output;
  };

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-card">
      <div className={`flex shrink-0 items-end gap-0.5 border-b border-border px-2 pt-2 ${hScrollThin}`}>
        {state.branches.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={event => event.dataTransfer.setData('application/x-wt-branch', item.id)}
            onClick={() => actions.mutateState(value => { value.activeBranchId = item.id; })}
            onDoubleClick={() => { const name = prompt('Branch name:', item.name); if (name) actions.renameBranch(item.id, name); }}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              const draggedBranchId = event.dataTransfer.getData('application/x-wt-branch');
              if (draggedBranchId) {
                const midpoint = event.currentTarget.getBoundingClientRect().left + event.currentTarget.getBoundingClientRect().width / 2;
                actions.reorderBranch(draggedBranchId, item.id, event.clientX < midpoint ? 'before' : 'after');
              } else {
                actions.moveNodeToBranch(event.dataTransfer.getData('text/plain'), item.id);
              }
            }}
            className={`relative -bottom-px flex shrink-0 cursor-pointer items-center gap-1 rounded-t-lg border border-b-0 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[.06em] ${state.activeBranchId === item.id ? 'border-border bg-card text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >
            <span className="max-w-20 truncate">{item.name}</span>
            {state.branches.length > 1 && (
              <button type="button" onClick={event => { event.stopPropagation(); if (confirm(`Delete "${item.name}"?`)) actions.removeBranch(item.id); }} className="text-muted-foreground/70 hover:text-destructive">×</button>
            )}
          </div>
        ))}
        {!state.isPremium && state.branches.length >= actions.freeWoodLimit
          ? <button type="button" title="Feature soon unlocked" onClick={() => actions.mutateState(value => { value.premiumModal = true; })} className="px-2 py-1 text-[10px] font-bold text-muted-foreground/70">Branch {actions.freeWoodLimit + 1} 🔒</button>
          : <button type="button" onClick={actions.addBranch} className="px-2 py-1 text-base text-muted-foreground/70 hover:text-primary">+</button>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border p-2">
        <button
          type="button"
          onClick={() => actions.mutateState(value => { value.sbPinFirst = !value.sbPinFirst; })}
          className={`rounded-full border px-2 py-0.5 text-[11px] ${state.sbPinFirst ? 'border-primary text-primary' : 'border-border text-muted-foreground/70'}`}
        >
          Pinned first
        </button>
        <select
          value={state.sbFilterTag}
          disabled={!allTags.length}
          onChange={event => actions.mutateState(value => { value.sbFilterTag = event.target.value; })}
          className="min-w-0 flex-1 appearance-none rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] outline-none"
        >
          <option value="">All tags</option>
          {allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
        </select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {!branchNodes.length ? (
          <div className="p-4 text-center text-xs leading-5 text-muted-foreground/70">Empty branch — search for an artist or label to start</div>
        ) : state.sbFilterTag ? (
          (state.isPremium ? filtered : filtered.slice(0, actions.freeNodeLimit)).map(node => <SidebarNode key={node.id} node={node} depth={0} state={state} actions={actions} />)
        ) : renderNodes()}
        {!state.isPremium && branchNodes.length > actions.freeNodeLimit && (
          <Button
            variant="secondary"
            className="mx-2 mt-2 h-auto w-[calc(100%-16px)] gap-2 py-2 text-[11px] font-normal text-muted-foreground"
            onClick={() => actions.mutateState(value => { value.premiumModal = true; })}
          >
            🔒 {branchNodes.length - actions.freeNodeLimit} more <span className="rounded bg-primary/15 px-1.5 text-[9px] font-bold text-primary">SOON</span>
          </Button>
        )}
      </div>
    </aside>
  );
};

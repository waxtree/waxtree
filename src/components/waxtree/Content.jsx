import { useEffect, useState } from 'react';
import { NodeTypeIcon } from '@/components/waxtree/icons/NodeTypeIcon';
import { NodeDetails } from '@/components/waxtree/NodeDetails';
import { PlantLoader } from '@/components/waxtree/PlantLoader';
import { buttonSecondary } from '@/lib/waxtreeUi';

export const Content = ({ state, actions }) => {
  const node = actions.getNode(state.selectedId);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [node?.id]);
  useEffect(() => { if (node?.loaded && node.data) void actions.fetchBandcamp(node.id, node.data.name || node.name); }, [actions, node?.data, node?.id, node?.loaded, node?.name]);

  if (!node) {
    return (
      <main className="flex items-center justify-center overflow-y-auto p-7 text-center text-muted-foreground/70">
        <div>
          <div className="text-4xl opacity-30">🌿</div>
          <div className="mt-3 font-semibold text-muted-foreground">No node selected</div>
          <p className="mt-2 text-xs">Search for an artist or label and select it from the sidebar</p>
        </div>
      </main>
    );
  }

  const chain = actions.ancestry(node.id);
  const data = node.data;
  const isLabel = node.type === 'label';
  // "Follow" means "watch this artist/label for new releases" — a static
  // curated list has no such concept, and scanFollowsForNewReleases()
  // itself only knows how to check artist/label ids (see its own path
  // ternary), so a discogs_list entry sitting in st.follows would get
  // queried as if its id were an artist's — hidden entirely here rather
  // than letting that mismatch happen.
  const canFollow = node.type !== 'discogs_list';
  const followed = canFollow && state.follows.some(item => item.discogs_id === node.discogsId && item.type === node.type);

  return (
    <main className="min-w-0 overflow-y-auto px-7 pb-28 pt-7">
      {chain.length > 1 && (
        <div className="mb-2.5 flex items-center gap-1 text-xs text-muted-foreground">
          {chain.map((item, index) => (
            <span key={item.id} className="flex items-center gap-1">
              {index > 0 && <span className="text-muted-foreground/70">›</span>}
              <button type="button" onClick={() => actions.selectNode(item.id)} className={index === chain.length - 1 ? 'text-primary' : 'hover:text-foreground'}>{item.name}</button>
            </span>
          ))}
        </div>
      )}
      <div className="mb-1 flex items-center gap-3">
        {data?.imageUrl ? <img className="size-[52px] rounded-[10px] border border-border object-cover" src={data.imageUrl} alt={node.name} /> : <div className="flex size-[52px] items-center justify-center rounded-[10px] border border-border bg-secondary text-muted-foreground"><NodeTypeIcon type={node.type} className="size-6" /></div>}
        <h1 className="min-w-0 flex-1 truncate text-[26px] font-bold">{node.name}</h1>
        {canFollow && (
          <button
            type="button"
            onClick={() => actions.toggleFollow(node)}
            className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${followed ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
          >
            {followed ? '✓ Following' : '+ Follow'}
          </button>
        )}
      </div>
      {node.loading && <PlantLoader />}
      {node.error && (
        <div className="flex flex-col items-center gap-3 px-7 py-12 text-center">
          <div className="text-4xl">🌱</div>
          <strong>{node.error}</strong>
          <button type="button" className={buttonSecondary} onClick={() => actions.retryNode(node.id)}>Try again</button>
        </div>
      )}
      {data && !node.loading && !node.error && <NodeDetails node={node} data={data} isLabel={isLabel} state={state} actions={actions} page={page} setPage={setPage} />}
    </main>
  );
};

import { useEffect, useState } from 'react';
import { ArtistIcon } from '@/components/waxtree/icons/ArtistIcon';
import { BandcampNode } from '@/components/waxtree/BandcampNode';
import { GenreYearResults } from '@/components/waxtree/GenreYearResults';
import { LabelIcon } from '@/components/waxtree/icons/LabelIcon';
import { NodeDetails } from '@/components/waxtree/NodeDetails';
import { PlantLoader } from '@/components/waxtree/PlantLoader';
import { buttonSecondary } from '@/lib/waxtreeUi';

export const Content = ({ state, actions }) => {
  const node = actions.getNode(state.selectedId);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [node?.id]);
  const isBcNode = node?.type === 'bcArtist' || node?.type === 'bcLabel';
  useEffect(() => { if (node?.type === 'artist' || node?.type === 'label') { if (node?.loaded && node.data) void actions.fetchBandcamp(node.id, node.data.name || node.name); } }, [actions, node?.data, node?.id, node?.loaded, node?.name, node?.type]);
  useEffect(() => { if ((node?.type === 'artist' || node?.type === 'label') && node?.loaded && node.data) void actions.fetchBandcampOnly(node.id); }, [actions, node?.data, node?.id, node?.loaded, node?.type]);

  if (node?.type === 'genreYear') {
    return <GenreYearResults node={node} state={state} actions={actions} />;
  }
  if (isBcNode) {
    return <BandcampNode node={node} state={state} actions={actions} />;
  }

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
  const followed = state.follows.some(item => item.discogs_id === node.discogsId && item.type === node.type);
  // What this act is actually known for, from its own catalog — not a
  // Discogs field, computed client-side from the genre/style tag on every
  // release already loaded for this node. Sits right of "Label/Artist ·
  // N releases" instead of its own row further down, filling the empty
  // space that line otherwise leaves before the Follow button.
  const genreFocus = data ? actions.getGenreFocus(data.tracks) : null;
  const genreFocusPrimary = genreFocus?.slice(0, 2) || [];
  const genreFocusSecondary = genreFocus?.slice(2) || [];

  return (
    <main className="min-w-0 overflow-y-auto px-7 pb-28 pt-7 max-sm:px-3.5 max-sm:pb-56">
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
      <div className="mb-5 flex items-center gap-4">
        {data?.imageUrl ? <img className="size-20 shrink-0 rounded-2xl border border-border object-cover max-sm:size-14" src={data.imageUrl} alt={node.name} /> : <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary text-muted-foreground max-sm:size-14">{isLabel ? <LabelIcon className="size-8" /> : <ArtistIcon className="size-8" />}</div>}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[28px] font-bold leading-tight max-sm:text-xl">{node.name}</h1>
          {data && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <p className="shrink-0 text-[13px] text-muted-foreground">{isLabel ? 'Label' : 'Artist'} · {data.trackCount} releases</p>
              {genreFocus && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* No raw numbers — two explicit groups instead: the top 2
                      tags as bigger, solid "main" pills, then a plain-text
                      "also" separator before the rest as smaller, lighter
                      ones. Grouping + a word reads unambiguously; a subtle
                      color/fill difference alone (tried first) turned out
                      too subtle to tell apart at a glance. */}
                  <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-muted-foreground/70">Focus:</span>
                  {genreFocusPrimary.map(({ genre }) => {
                    const color = actions.genreColor(genre);
                    return (
                      <span key={genre} style={{ backgroundColor: `${color}33`, borderColor: color, color }} className="inline-flex items-center whitespace-nowrap rounded-[10px] border px-2.5 py-1 text-[12.5px] font-bold">
                        {genre}
                      </span>
                    );
                  })}
                  {genreFocusSecondary.length > 0 && (
                    <>
                      <span className="text-[10.5px] font-medium text-muted-foreground/60">also</span>
                      {genreFocusSecondary.map(({ genre }) => {
                        const color = actions.genreColor(genre);
                        return (
                          <span key={genre} style={{ backgroundColor: `${color}14`, borderColor: `${color}4d`, color }} className="inline-flex items-center whitespace-nowrap rounded-[10px] border px-2 py-0.5 text-[10.5px] font-semibold opacity-80">
                            {genre}
                          </span>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => actions.toggleFollow(node)}
          className={`shrink-0 rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${followed ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
        >
          {followed ? '✓ Following' : '+ Follow'}
        </button>
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

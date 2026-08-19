import { useEffect } from 'react';
import { BandcampOnlyResults } from '@/components/waxtree/BandcampOnlyResults';
import { Filters } from '@/components/waxtree/Filters';
import { RelatedEntities } from '@/components/waxtree/RelatedEntities';
import { ReleaseCard } from '@/components/waxtree/ReleaseCard';
import { ReleaseSection } from '@/components/waxtree/ReleaseSection';
import { buttonSecondary } from '@/lib/waxtreeUi';

export const NodeDetails = ({ node, data, isLabel, state, actions, page, setPage }) => {
  const bcOnly = actions.getBandcampOnly(node.id);
  const bandcampOnlyView = !!state.bandcampOnlyView[node.id];
  const filtered = actions.applyFilters(data.tracks || []);
  const hasFilter = state.filterTitle || state.filterFormat !== 'all' || state.filterSort !== 'default' || state.filterGenres.length > 0;
  const notOwned = filtered.filter(track => !actions.inDiscogsCollection(track));
  const ownedGroups = actions.groupTracksByRelease(filtered.filter(track => actions.inDiscogsCollection(track)));
  const groups = actions.groupTracksByRelease(notOwned);
  const listenedGroups = groups.filter(group => state.alreadyListened.includes(group.key));
  const listenedIds = new Set(listenedGroups.flatMap(group => group.tracks.flatMap(track => [track.id, ...(track.altIds || [])])));
  const browsable = notOwned.filter(track => !listenedIds.has(track.id));
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(browsable.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleGroups = actions.groupTracksByRelease(browsable.slice(safePage * pageSize, (safePage + 1) * pageSize));
  const genres = [...new Set((data.tracks || []).flatMap(track => track.genre ? track.genre.split(' · ') : []))].sort();

  useEffect(() => {
    const target = state.scrollToRelease;
    if (!target || target.nodeId !== node.id) return;
    const matches = track => track.id.split('-')[0] === String(target.releaseId)
      || (target.titleNorm && actions.normalizeStr(track.album || track.title) === target.titleNorm);
    const targetIndex = browsable.findIndex(matches);
    const targetGroup = groups.find(group => group.tracks.some(matches));
    if (targetIndex >= 0) setPage(Math.floor(targetIndex / pageSize));
    actions.mutateState(value => { value.scrollToRelease = null; });
    if (targetGroup) setTimeout(() => {
      [...document.querySelectorAll('[data-release-key]')].find(element => element.dataset.releaseKey === targetGroup.key)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }, [actions, browsable, groups, node.id, setPage, state.scrollToRelease]);

  return (
    <>
      <p className="mb-2.5 text-[13px] text-muted-foreground">{isLabel ? 'Label' : 'Artist'} · {data.trackCount} releases on Discogs</p>
      {data.highlights && (
        <div className="mb-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {[data.highlights.yearRange, `${data.trackCount} release`, data.country].filter(Boolean).map(item => <span key={item} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">{item}</span>)}
          </div>
          {(data.highlights.curiosity || (isLabel ? data.highlights.artistStr : data.highlights.labelStr)) && (
            <p className="rounded-lg border-l-2 border-primary bg-secondary p-3 text-xs leading-5 text-muted-foreground">{data.highlights.curiosity || (isLabel ? data.highlights.artistStr : data.highlights.labelStr)}</p>
          )}
        </div>
      )}
      {!isLabel && data.correlatedArtists?.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-[10px] font-bold uppercase text-muted-foreground/70">Related artists</span>
          <div className="flex flex-wrap gap-1.5">{data.correlatedArtists.map(name => <button key={name} type="button" onClick={() => actions.mutateState(value => { value.q = name; actions.doSearch(); })} className={buttonSecondary}>{name}</button>)}</div>
        </div>
      )}
      <RelatedEntities node={node} data={data} isLabel={isLabel} actions={actions} />
      {data.bio && (
        <div className="mb-[18px] rounded-[10px] border border-border bg-card p-3.5">
          <p className={`text-[12.5px] leading-6 text-muted-foreground ${state.bioOpen[node.id] ? '' : 'line-clamp-5'}`}>{data.bio}</p>
          <button type="button" onClick={() => actions.mutateState(value => { value.bioOpen[node.id] = !value.bioOpen[node.id]; })} className="mt-2 text-xs text-primary">{state.bioOpen[node.id] ? '▲ less' : '▼ read more'}</button>
        </div>
      )}
      {data.tracks?.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">
                {isLabel ? 'Releases' : 'Tracks'} ({data.trackCount} Discogs, {filtered.length} loaded)
              </span>
              {bcOnly.status === 'done' && bcOnly.releases.length > 0 && (
                <button
                  type="button"
                  onClick={() => actions.mutateState(value => { value.bandcampOnlyView[node.id] = !value.bandcampOnlyView[node.id]; })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.06em] transition-colors ${bandcampOnlyView ? 'border-[#1DA0C3] bg-[rgba(29,160,195,.12)] text-[#1DA0C3]' : 'border-[rgba(29,160,195,.5)] text-[#1DA0C3] hover:bg-[rgba(29,160,195,.12)]'}`}
                >
                  Only on Bandcamp ({bcOnly.releases.length})
                </button>
              )}
            </div>
            {!bandcampOnlyView && (
              <button type="button" onClick={() => actions.mutateState(value => { value.filterOpen = !value.filterOpen; })} className={`rounded-full border px-3 py-1 text-xs ${state.filterOpen || hasFilter ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>⚙ Filter{hasFilter ? ' •' : ''}</button>
            )}
          </div>
          {bandcampOnlyView ? (
            <BandcampOnlyResults node={node} isLabel={isLabel} state={state} actions={actions} />
          ) : (
            <>
              {state.filterOpen && <Filters state={state} genres={genres} resultCount={filtered.length} actions={actions} onResetPage={() => setPage(0)} />}
              <div className="mt-3 flex flex-col gap-[6px]">
                {visibleGroups.length ? visibleGroups.map(group => <ReleaseCard key={group.key} group={group} node={node} isLabel={isLabel} state={state} actions={actions} />) : <div className="py-8 text-center text-xs text-muted-foreground/70">No tracks match the filters.</div>}
              </div>
              {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button type="button" disabled={safePage === 0} onClick={() => setPage(value => value - 1)} className={`${buttonSecondary} disabled:opacity-30`}>← Prev</button>
                  <span className="text-xs text-muted-foreground">Page {safePage + 1} / {totalPages}</span>
                  <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(value => value + 1)} className={`${buttonSecondary} disabled:opacity-30`}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}
      <ReleaseSection title="IN YOUR COLLECTION" groups={ownedGroups} node={node} isLabel={isLabel} state={state} actions={actions} />
      <ReleaseSection title="ALREADY LISTENED" groups={listenedGroups} node={node} isLabel={isLabel} state={state} actions={actions} />
    </>
  );
};

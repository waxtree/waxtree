import { ArrowUpRight, X } from 'lucide-react';
import { useEffect } from 'react';
import { ReleaseCard } from '@/components/waxtree/ReleaseCard';

// The opened record under a dashboard string. It is the same ReleaseCard the
// genre/year results use — play, like, add to a playlist, Explore — with one
// difference: its synthetic node asks Explore to open in the foreground, which
// is what carries the person from the dashboard into digging mode.
export const DashboardRelease = ({ item, state, actions, onClose }) => {
  useEffect(() => { actions.fetchGenreYearReleaseDetails([item.id]); }, [actions, item.id]);
  const detail = actions.getGenreYearReleaseDetail(item.id);
  const discogsUrl = `https://www.discogs.com/release/${item.id}`;

  const body = (() => {
    if (!detail || detail.loading) {
      return (
        <div className="flex items-center gap-3 px-[14px] py-3 text-xs text-muted-foreground">
          <span className="block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading {item.name}…
        </div>
      );
    }
    if (detail.err || !detail.tracks.length) {
      return (
        <div className="flex items-center gap-3 px-[14px] py-3 text-xs text-muted-foreground">
          Couldn&apos;t load the tracklist.
          <a href={discogsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">Open on Discogs<ArrowUpRight className="size-3" /></a>
        </div>
      );
    }
    const node = { id: null, name: detail.tracks[0].releaseArtistName || item.artist || item.label || 'Various', branchId: state.activeBranchId, foregroundExplore: true };
    return <ReleaseCard group={{ key: `gy-${item.id}`, tracks: detail.tracks }} node={node} isLabel={false} state={state} actions={actions} />;
  })();

  return (
    <div className="relative mt-1 rounded-xl border border-primary/40 bg-card/60 p-1.5">
      <button type="button" onClick={onClose} title="Close" aria-label="Close release" className="absolute -top-2.5 right-3 z-10 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary">
        <X className="size-3" />
      </button>
      {body}
    </div>
  );
};

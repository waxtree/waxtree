import { DashboardRelease } from '@/components/dashboard/DashboardRelease';
import { ReleaseTile } from '@/components/dashboard/ReleaseTile';
import { hScrollThin } from '@/lib/waxtreeUi';

const SKELETON_TILES = 6;

// One dashboard string: a title, a one-line reason, and a scroller of records.
export const DashboardRow = ({ row, first, openId, onOpen, onRetry, state, actions }) => {
  const openItem = row.items.find(item => item.id === openId);
  return (
    <section aria-label={row.title} data-tour={first ? 'dashboard-row' : undefined} className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h2 className="text-[17px] font-bold">{row.title}</h2>
        <p className="min-w-0 truncate text-xs text-muted-foreground">{row.subtitle}</p>
      </div>
      {row.status === 'loading' && (
        <div className="flex gap-3 overflow-hidden" aria-busy="true">
          {Array.from({ length: SKELETON_TILES }, (_, index) => (
            <div key={index} className="w-[148px] shrink-0 max-sm:w-[132px]">
              <div className="aspect-square animate-pulse rounded-[10px] bg-secondary" />
              <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-secondary" />
              <div className="mt-1.5 h-2.5 w-3/5 animate-pulse rounded bg-secondary" />
            </div>
          ))}
        </div>
      )}
      {row.status === 'error' && (
        <p className="flex items-center gap-3 text-xs text-muted-foreground">
          Discogs didn&apos;t respond for this one.
          <button type="button" onClick={onRetry} className="font-semibold text-primary hover:underline">Try again</button>
        </p>
      )}
      {row.status === 'ready' && (
        <div className={`-mx-1 flex snap-x gap-3 px-1 pb-3 ${hScrollThin}`}>
          {row.items.map(item => (
            <ReleaseTile key={item.id} item={item} active={item.id === openId} listened={state.alreadyListened.includes(`gy-${item.id}`)} onClick={() => onOpen(item.id === openId ? null : item.id)} />
          ))}
        </div>
      )}
      {openItem && <DashboardRelease key={openItem.id} item={openItem} state={state} actions={actions} onClose={() => onOpen(null)} />}
    </section>
  );
};

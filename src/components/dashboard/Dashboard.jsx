import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { DashboardRow } from '@/components/dashboard/DashboardRow';
import { FREQUENCY_PHRASE } from '@/lib/dashboardProfile';
import { ROLE_OPTIONS } from '@/lib/onboardingContent';
import { useDashboard } from '@/lib/useDashboard';
import { buttonSecondary } from '@/lib/waxtreeUi';

const depthBlurb = depth => {
  if (depth >= 0.85) return 'Deep cuts — the obvious neighbours of your favourites are left out.';
  if (depth >= 0.6) return "Going past your favourites' own circle, into what sounds like them.";
  if (depth >= 0.4) return 'A mix of close family and a little further out.';
  return 'The essentials and the close family of your favourites.';
};

// The Home view and the landing page after login: strings of suggested
// records built from the onboarding taste data. It stays mounted under the
// workspace — digging covers it (see CenterPanel).
export const Dashboard = ({ state, actions }) => {
  const { rows, building, loading, allFailed, empty, shuffle, retry, profile } = useDashboard(state, actions);
  // Which record is open, keyed by its string too, so the same release in two
  // strings can't open twice.
  const [open, setOpen] = useState(null);
  const role = ROLE_OPTIONS.find(option => option.value === state.onboarding.role)?.title;
  const hasGenres = state.onboarding.genres.length > 0;

  return (
    <main className="min-w-0 overflow-y-auto px-7 pb-28 pt-7 max-sm:px-3.5 max-sm:pb-56">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight max-sm:text-xl">Today&apos;s digs</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{role ? `${role} · ` : ''}digging {FREQUENCY_PHRASE[profile.frequency]} — {depthBlurb(profile.depth)}</p>
        </div>
        {hasGenres && (
          <button type="button" onClick={shuffle} disabled={loading} className={`${buttonSecondary} inline-flex items-center gap-1.5 disabled:opacity-40`}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Shuffle
          </button>
        )}
      </div>
      {!hasGenres && (
        <div className="flex flex-col items-center gap-3 px-7 py-16 text-center">
          <div className="text-4xl opacity-40">🌿</div>
          <strong>Nothing to suggest yet</strong>
          <p className="max-w-sm text-xs text-muted-foreground">Pick a few genres in your taste profile and this page fills with records to dig.</p>
          <button type="button" className={buttonSecondary} onClick={actions.restartOnboarding}>Edit taste profile</button>
        </div>
      )}
      {hasGenres && building && <p className="py-12 text-center text-sm text-muted-foreground">Building today&apos;s page…</p>}
      {empty && (
        <div className="flex flex-col items-center gap-2 px-7 py-12 text-center">
          <strong>Nothing new to suggest right now</strong>
          <p className="max-w-sm text-xs text-muted-foreground">Everything found this time is already in your collection, already listened, or too close to your favourites. Shuffle digs somewhere else.</p>
        </div>
      )}
      {allFailed && (
        <div className="flex flex-col items-center gap-3 px-7 py-12 text-center">
          <div className="text-4xl">🌱</div>
          <strong>Discogs didn&apos;t respond — try again in a moment.</strong>
          <button type="button" className={buttonSecondary} onClick={retry}>Try again</button>
        </div>
      )}
      {!allFailed && rows.map(row => (
        <DashboardRow
          key={row.id}
          row={row}
          openId={open?.rowId === row.id ? open.releaseId : null}
          onOpen={releaseId => setOpen(releaseId ? { rowId: row.id, releaseId } : null)}
          onRetry={retry}
          state={state}
          actions={actions}
        />
      ))}
    </main>
  );
};

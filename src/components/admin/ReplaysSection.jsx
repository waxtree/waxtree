import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtDateTime, fmtDuration } from '@/lib/admin';

// Sentry.setUser() only tags sessions recorded after it shipped — anything
// older shows as "Anonymous visitor" with no way to know whose session it
// was after the fact. The first page visited is the next best clue for
// telling an old admin testing session apart from a real visitor's, so it's
// worth showing even though it can't fully replace the real fix.
const firstPath = url => {
  if (!url) return null;
  try { return new URL(url).pathname; } catch { return url; }
};

export const ReplaysSection = ({ state }) => (
  <Card size="sm" className="mt-8">
    <CardHeader>
      <CardTitle className="text-base">Session Replays</CardTitle>
    </CardHeader>
    <CardContent>
      {state.loading && <div className="text-muted-foreground">Loading…</div>}
      {state.error && <div className="text-destructive">Failed to load replays: {state.error}</div>}
      {state.items && !state.items.length && <div className="text-muted-foreground">No replays yet — real users need to accept cookies and use the app for one to show up here.</div>}
      {state.items && state.items.length > 0 && (
        <div className="divide-y divide-border">
          {state.items.map(replay => (
            <div key={replay.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate">{replay.userEmail || 'Anonymous visitor'}</span>
                {firstPath(replay.firstUrl) && <span className="block truncate text-[11px] text-muted-foreground/70">{firstPath(replay.firstUrl)}</span>}
              </span>
              <span className="text-muted-foreground">{fmtDateTime(replay.startedAt)}</span>
              <span className="text-muted-foreground">{fmtDuration(replay.durationSec)}{replay.errorCount > 0 && <span className="ml-1.5 text-destructive">· {replay.errorCount} error{replay.errorCount > 1 ? 's' : ''}</span>}</span>
              <a href={replay.replayUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">Watch<ArrowUpRight className="size-3" /></a>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

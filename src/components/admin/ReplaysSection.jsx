import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtDateTime, fmtDuration } from '@/lib/admin';

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
              <span className="truncate">{replay.userEmail || 'Anonymous visitor'}</span>
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

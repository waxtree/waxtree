import { describeEvent, fmtDateTime } from '@/lib/admin';

export const EventsList = ({ state }) => {
  if (!state || state.loading) return <div className="p-2 text-muted-foreground">Loading…</div>;
  if (state.error) return <div className="p-2 text-destructive">Failed to load events: {state.error}</div>;
  if (!state.items.length) return <div className="p-2 text-muted-foreground">No digging events yet.</div>;

  return (
    <div className="divide-y divide-border">
      {state.items.map(event => (
        <div key={event.id} className="grid grid-cols-[80px_1fr_auto] gap-3 py-2">
          <span className="font-semibold text-primary">{event.event}</span>
          <span>{describeEvent(event)}</span>
          <span className="text-muted-foreground">{fmtDateTime(event.created_at)}</span>
        </div>
      ))}
    </div>
  );
};

import { TasteList } from '@/components/admin/TasteList';
import { frequencyLabel, roleLabel } from '@/lib/admin';

// A user's onboarding taste profile, shown when their row is expanded.
export const UserTaste = ({ taste }) => {
  if (!taste?.onboarded) return <p className="pb-3 text-xs text-muted-foreground">No taste profile yet — this user hasn&apos;t finished the onboarding.</p>;
  return (
    <div className="grid gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-4">
      <TasteList label="Who" items={[roleLabel(taste.role), frequencyLabel(taste.frequency)].filter(Boolean)} />
      <TasteList label="Genres" items={taste.genres} />
      <TasteList label="Favourite artists" items={taste.favorite_artists} />
      <TasteList label="Favourite labels" items={taste.favorite_labels} />
    </div>
  );
};

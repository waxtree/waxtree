import { SignupsChart } from '@/components/admin/SignupsChart';
import { StatTile } from '@/components/admin/StatTile';
import { TopTable } from '@/components/admin/TopTable';
import { frequencyLabel, roleLabel } from '@/lib/admin';

export const StatsSection = ({ stats }) => {
  const { users, signups_by_day: byDay, digging_events: digging, top_genres: genres, shared_caches: caches, new_schema: schema, taste } = stats;
  const tiles = [
    ['Users', users.total, `${users.premium} premium · ${users.free} free`],
    ['Active (7d)', users.active_7d, `of ${users.total} total users`],
    ['Active (30d)', users.active_30d, `of ${users.total} total users`],
    ['Digging events', digging.total, `${digging.last_7_days} in last 7 days`],
    ['Discogs cache (shared)', caches.discogs_node_cache, 'artists/labels cached'],
    ['YouTube matches', caches.yt_video_matches_found, `${caches.yt_video_matches_confirmed_none} confirmed no match`],
    ['Trees / Nodes', `${schema.trees} / ${schema.nodes}`, `${schema.sessions} sessions`],
    ['Taste profiles', taste.onboarded, `of ${users.total} users finished the onboarding`],
  ];
  const entries = Object.entries(byDay);

  return (
    <>
      <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        {tiles.map(([label, value, sub]) => <StatTile key={label} label={label} value={value} sub={sub} />)}
      </div>
      <div className="mt-5">
        <SignupsChart entries={entries} />
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <TopTable title="Events by type" heading="Event" rows={Object.entries(digging.by_type)} />
        <TopTable title="Most played styles/genres" heading="Name" rows={genres.map(item => [item.genre, item.count])} />
      </div>
      <h2 className="mt-8 text-base font-semibold">Who&apos;s digging</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">From the onboarding answers of everyone who finished it.</p>
      <div className="mt-3 grid gap-5 md:grid-cols-3">
        <TopTable title="Roles" heading="Role" rows={taste.roles.map(([role, count]) => [roleLabel(role), count])} />
        <TopTable title="How often they dig" heading="Frequency" rows={taste.frequencies.map(([frequency, count]) => [frequencyLabel(frequency), count])} />
        <TopTable title="Genres picked" heading="Genre" rows={taste.genres} />
      </div>
    </>
  );
};

import { useCallback, useEffect, useState } from 'react';
import { ThemeFrame, useTheme } from '../components/AppChrome';
import { supabase } from '../lib/supabase';

const tableClass = 'w-full border-collapse overflow-hidden rounded-lg text-left text-xs';
const thClass = 'border-b border-[var(--wt-border)] bg-[var(--wt-elevated)] px-3 py-2.5 font-semibold text-[var(--wt-muted)]';
const tdClass = 'border-b border-[var(--wt-border)] px-3 py-2.5 align-top';

function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

function fmtDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

async function authedFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('no session');
  return fetch(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  });
}

function describeEvent(event) {
  const payload = event.payload || {};
  switch (event.event) {
    case 'explore': return `${payload.type || ''}: ${payload.name || ''}${payload.parent_name ? ` (from ${payload.parent_name})` : ''}`;
    case 'play': return `${payload.artist || ''} – ${payload.title || ''}${payload.genre ? ` · ${payload.genre}` : ''}`;
    case 'like':
    case 'queue': return `${payload.artist || ''} – ${payload.title || ''}`;
    case 'follow': return `${payload.type || ''}: ${payload.name || ''}`;
    default: return JSON.stringify(payload);
  }
}

export function AdminPage() {
  const [theme] = useTheme();
  const [status, setStatus] = useState('loading');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [events, setEvents] = useState({});
  const [busyUser, setBusyUser] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login?next=/admin'; return; }
      const [statsResponse, usersResponse] = await Promise.all([authedFetch('/api/admin-stats'), authedFetch('/api/admin-users')]);
      if ([401, 403].includes(statsResponse.status) || [401, 403].includes(usersResponse.status)) { setStatus('unauthorized'); return; }
      if (!statsResponse.ok || !usersResponse.ok) { setStatus('failed'); return; }
      setStats(await statsResponse.json());
      setUsers((await usersResponse.json()).users);
      setStatus('ready');
    } catch (error) {
      setStatus(`error:${error.message}`);
    }
  }, []);

  useEffect(() => { document.title = 'WaxTree — Admin'; void load(); }, [load]);

  const toggleUser = async user => {
    if (!confirm(`Set this user to ${user.premium ? 'Free' : 'Premium'}?`)) return;
    setBusyUser(user.id);
    try {
      const response = await authedFetch('/api/admin-set-premium', { method: 'POST', body: JSON.stringify({ user_id: user.id, premium: !user.premium }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`);
      await load();
    } catch (error) {
      alert(`Failed to update tier: ${error.message}`);
    } finally {
      setBusyUser(null);
    }
  };

  const toggleEvents = async userId => {
    const open = !expanded[userId];
    setExpanded(current => ({ ...current, [userId]: open }));
    if (!open || events[userId]) return;
    setEvents(current => ({ ...current, [userId]: { loading: true } }));
    try {
      const response = await authedFetch(`/api/admin-user-events?user_id=${encodeURIComponent(userId)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setEvents(current => ({ ...current, [userId]: { items: payload.events } }));
    } catch (error) {
      setEvents(current => ({ ...current, [userId]: { error: error.message } }));
    }
  };

  return (
    <ThemeFrame theme={theme} className="min-h-dvh p-6 text-sm">
      <main className="mx-auto max-w-[1180px]">
        <h1 className="text-2xl font-bold">WaxTree — Admin</h1>
        <p className="mt-1 text-xs text-[var(--wt-muted)]">Internal only. Not linked from the app.</p>

        {status !== 'ready' ? (
          <div className="mt-8 rounded-lg border border-[var(--wt-border)] bg-[var(--wt-surface)] p-6 text-[var(--wt-muted)]">
            {status === 'loading' && 'Loading…'}
            {status === 'unauthorized' && 'Not authorized.'}
            {status === 'failed' && 'Failed to load — try reloading.'}
            {status.startsWith('error:') && `Error: ${status.slice(6)}`}
          </div>
        ) : (
          <>
            <Stats stats={stats} />
            <section className="mt-8 overflow-x-auto rounded-lg border border-[var(--wt-border)] bg-[var(--wt-surface)]">
              <h2 className="px-4 pt-4 text-base font-semibold">Users</h2>
              <table className={`${tableClass} mt-3 min-w-[980px]`}>
                <thead><tr>{['', 'Email', 'Joined', 'Last active', 'Library tracks', 'Searches', 'Nodes opened', 'Tier', ''].map(label => <th className={thClass} key={label}>{label}</th>)}</tr></thead>
                <tbody>
                  {users.map(user => {
                    const mismatch = user.profiles_tier != null && (user.profiles_tier === 'premium') !== user.premium;
                    return (
                      <UserRows key={user.id} user={user} mismatch={mismatch} open={!!expanded[user.id]} eventState={events[user.id]} busy={busyUser === user.id} onExpand={() => toggleEvents(user.id)} onToggle={() => toggleUser(user)} />
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </ThemeFrame>
  );
}

function Stats({ stats }) {
  const { users, signups_by_day: byDay, digging_events: digging, top_genres: genres, shared_caches: caches, new_schema: schema } = stats;
  const tiles = [
    ['Users', users.total, `${users.premium} premium · ${users.free} free`],
    ['Active (7d)', users.active_7d, `of ${users.total} total users`],
    ['Active (30d)', users.active_30d, `of ${users.total} total users`],
    ['Digging events', digging.total, `${digging.last_7_days} in last 7 days`],
    ['Discogs cache (shared)', caches.discogs_node_cache, 'artists/labels cached'],
    ['YouTube matches', caches.yt_video_matches_found, `${caches.yt_video_matches_confirmed_none} confirmed no match`],
    ['Trees / Nodes', `${schema.trees} / ${schema.nodes}`, `${schema.sessions} sessions`],
  ];
  const entries = Object.entries(byDay);
  const max = Math.max(1, ...entries.map(([, value]) => value));

  return (
    <>
      <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        {tiles.map(([label, value, sub]) => <div key={label} className="rounded-lg border border-[var(--wt-border)] bg-[var(--wt-surface)] p-4"><div className="text-[11px] uppercase text-[var(--wt-muted)]">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div><div className="mt-1 text-[11px] text-[var(--wt-muted)]">{sub}</div></div>)}
      </div>
      <section className="mt-5 rounded-lg border border-[var(--wt-border)] bg-[var(--wt-surface)] p-4">
        <h2 className="mb-3 text-xs font-semibold text-[var(--wt-muted)]">Signups — last 30 days</h2>
        <div className="flex h-[64px] items-end gap-1">{entries.map(([date, value]) => <div key={date} title={`${date}: ${value}`} style={{ height: Math.max(4, Math.round(value / max * 60)) }} className="min-w-1 flex-1 rounded-t bg-[var(--wt-accent)]" />)}</div>
      </section>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <TopTable title="Events by type" heading="Event" rows={Object.entries(digging.by_type)} />
        <TopTable title="Most played styles/genres" heading="Name" rows={genres.map(item => [item.genre, item.count])} />
      </div>
    </>
  );
}

function TopTable({ title, heading, rows }) {
  return <section className="overflow-hidden rounded-lg border border-[var(--wt-border)] bg-[var(--wt-surface)]"><h2 className="p-4 text-base font-semibold">{title}</h2><table className={tableClass}><thead><tr><th className={thClass}>{heading}</th><th className={thClass}>Count</th></tr></thead><tbody>{rows.length ? rows.map(([name, count]) => <tr key={name}><td className={tdClass}>{name}</td><td className={tdClass}>{count}</td></tr>) : <tr><td className={tdClass} colSpan={2}>No data yet</td></tr>}</tbody></table></section>;
}

function UserRows({ user, mismatch, open, eventState, busy, onExpand, onToggle }) {
  return (
    <>
      <tr>
        <td className={tdClass}><button onClick={onExpand}>{open ? '▾' : '▸'}</button></td>
        <td className={`${tdClass} font-medium`}>{user.email}</td>
        <td className={tdClass}>{fmtDate(user.created_at)}</td>
        <td className={tdClass}>{fmtDateTime(user.last_active)}</td>
        <td className={tdClass}>{user.library_track_count ?? '—'}</td>
        <td className={tdClass}>{user.search_count ?? 0}</td>
        <td className={tdClass}>{user.nodes_count ?? 0}</td>
        <td className={tdClass}><span className={`rounded px-2 py-1 text-[10px] font-bold ${user.premium ? 'bg-[var(--wt-accent)]/15 text-[var(--wt-accent)]' : 'bg-[var(--wt-elevated)] text-[var(--wt-muted)]'}`}>{user.premium ? 'Premium' : 'Free'}</span>{mismatch && <div className="mt-1 text-[10px] text-[#F47B5E]">profiles.tier: {user.profiles_tier} (mismatch)</div>}</td>
        <td className={tdClass}><button disabled={busy} onClick={onToggle} className="rounded-full border border-[var(--wt-border)] px-3 py-1.5 text-[11px] text-[var(--wt-muted)] hover:border-[var(--wt-accent)] hover:text-[var(--wt-accent)] disabled:opacity-50">{busy ? '…' : `Make ${user.premium ? 'Free' : 'Premium'}`}</button></td>
      </tr>
      {open && <tr><td className={tdClass} colSpan={9}><Events state={eventState} /></td></tr>}
    </>
  );
}

function Events({ state }) {
  if (!state || state.loading) return <div className="p-2 text-[var(--wt-muted)]">Loading…</div>;
  if (state.error) return <div className="p-2 text-[#F47B5E]">Failed to load events: {state.error}</div>;
  if (!state.items.length) return <div className="p-2 text-[var(--wt-muted)]">No digging events yet.</div>;
  return <div className="divide-y divide-[var(--wt-border)]">{state.items.map(event => <div key={event.id} className="grid grid-cols-[80px_1fr_auto] gap-3 py-2"><span className="font-semibold text-[var(--wt-accent)]">{event.event}</span><span>{describeEvent(event)}</span><span className="text-[var(--wt-muted)]">{fmtDateTime(event.created_at)}</span></div>)}</div>;
}

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth';

interface AdminStats {
  users: { total: number; premium: number; free: number; active_7d: number; active_30d: number };
  signups_by_day: Record<string, number>;
  digging_events: { total: number; by_type: Record<string, number>; last_7_days: number };
  top_genres: Array<{ genre: string; count: number }>;
  shared_caches: {
    discogs_node_cache: number;
    yt_video_matches_found: number;
    yt_video_matches_confirmed_none: number;
    yt_channel_matches: number;
  };
  new_schema: { sessions: number; trees: number; nodes: number };
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_active: string | null;
  premium: boolean;
  profiles_tier: string | null;
  library_track_count: number | null;
  search_count: number | null;
  nodes_count: number;
}

interface AdminEvent {
  event: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function eventLabel(event: AdminEvent) {
  const payload = event.payload ?? {};
  const from = typeof payload.from === 'string' ? payload.from : '';
  const to = typeof payload.to === 'string' ? payload.to : '';
  const track = typeof payload.track === 'string' ? payload.track : '';
  const artist = typeof payload.artist === 'string' ? payload.artist : '';
  if (event.event === 'explore') return `${from || 'Start'} -> ${to || 'unknown'}`;
  if (event.event === 'play') return [artist, track].filter(Boolean).join(' - ') || 'Play';
  return JSON.stringify(payload);
}

export function AdminPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [eventsByUser, setEventsByUser] = useState<Record<string, AdminEvent[]>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      'Content-Type': 'application/json',
    }),
    [session?.access_token],
  );

  useEffect(() => {
    if (!session) return;
    let disposed = false;

    async function load() {
      setError('');
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin-stats', { headers: authHeaders }),
        fetch('/api/admin-users', { headers: authHeaders }),
      ]);

      if (disposed) return;
      if (statsRes.status === 403 || usersRes.status === 403) {
        setError('Not authorized.');
        return;
      }
      if (!statsRes.ok || !usersRes.ok) {
        setError('Failed to load admin data.');
        return;
      }
      const statsBody = (await statsRes.json()) as AdminStats;
      const usersBody = (await usersRes.json()) as { users: AdminUser[] };
      setStats(statsBody);
      setUsers(usersBody.users);
    }

    void load();
    return () => {
      disposed = true;
    };
  }, [authHeaders, session]);

  async function togglePremium(user: AdminUser) {
    setBusyUserId(user.id);
    const response = await fetch('/api/admin-set-premium', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ user_id: user.id, premium: !user.premium }),
    });
    setBusyUserId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Could not update user.');
      return;
    }
    setUsers(items => items.map(item => (item.id === user.id ? { ...item, premium: !item.premium } : item)));
  }

  async function toggleEvents(userId: string) {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(userId);
    if (eventsByUser[userId]) return;
    const response = await fetch(`/api/admin-user-events?user_id=${encodeURIComponent(userId)}`, { headers: authHeaders });
    if (!response.ok) {
      setEventsByUser(items => ({ ...items, [userId]: [] }));
      return;
    }
    const body = (await response.json()) as { events: AdminEvent[] };
    setEventsByUser(items => ({ ...items, [userId]: body.events }));
  }

  if (error === 'Not authorized.') {
    return (
      <main className="admin-page">
        <div className="route-state">
          <h1>Not authorized</h1>
          <button className="btn btn--secondary" onClick={() => navigate('/app')}>
            Back to app
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <BrandMark compact />
        <div>
          <h1>Admin</h1>
          <p>Internal dashboard</p>
        </div>
        <div className="app-spacer" />
        <ThemeToggle />
        <Link className="btn btn--ghost" to="/app">
          App
        </Link>
      </header>

      {error && <div className="form-alert">{error}</div>}
      {!stats ? (
        <div className="route-state">Loading admin data…</div>
      ) : (
        <>
          <section className="metric-grid">
            <div className="metric-tile">
              <span>Users</span>
              <strong>{stats.users.total}</strong>
              <em>{stats.users.premium} premium</em>
            </div>
            <div className="metric-tile">
              <span>Active 7d</span>
              <strong>{stats.users.active_7d}</strong>
              <em>{stats.users.active_30d} active 30d</em>
            </div>
            <div className="metric-tile">
              <span>Digging events</span>
              <strong>{stats.digging_events.total}</strong>
              <em>{stats.digging_events.last_7_days} this week</em>
            </div>
            <div className="metric-tile">
              <span>Trees / Nodes</span>
              <strong>{stats.new_schema.trees} / {stats.new_schema.nodes}</strong>
              <em>{stats.new_schema.sessions} sessions</em>
            </div>
            <div className="metric-tile">
              <span>Discogs cache</span>
              <strong>{stats.shared_caches.discogs_node_cache}</strong>
              <em>shared artists/labels</em>
            </div>
            <div className="metric-tile">
              <span>YouTube matches</span>
              <strong>{stats.shared_caches.yt_video_matches_found}</strong>
              <em>{stats.shared_caches.yt_video_matches_confirmed_none} none</em>
            </div>
          </section>

          <section className="admin-panel">
            <h2>Users</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Last active</th>
                    <th>Plan</th>
                    <th>Library</th>
                    <th>Nodes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <Fragment key={user.id}>
                      <tr key={user.id}>
                        <td className="email-cell">{user.email}</td>
                        <td>{fmtDate(user.created_at)}</td>
                        <td>{fmtDateTime(user.last_active)}</td>
                        <td>
                          <span className={user.premium ? 'badge premium' : 'badge free'}>
                            {user.premium ? 'premium' : 'free'}
                          </span>
                          {user.profiles_tier && user.profiles_tier !== (user.premium ? 'premium' : 'free') && (
                            <span className="badge mismatch">profile mismatch</span>
                          )}
                        </td>
                        <td>{user.library_track_count ?? '-'}</td>
                        <td>{user.nodes_count}</td>
                        <td className="row-actions">
                          <button className="btn btn--tiny" onClick={() => toggleEvents(user.id)}>
                            {expandedUser === user.id ? 'Hide' : 'Events'}
                          </button>
                          <button
                            className="btn btn--tiny"
                            onClick={() => togglePremium(user)}
                            disabled={busyUserId === user.id}
                          >
                            {user.premium ? 'Set free' : 'Set premium'}
                          </button>
                        </td>
                      </tr>
                      {expandedUser === user.id && (
                        <tr className="events-row">
                          <td colSpan={7}>
                            {(eventsByUser[user.id] ?? []).length === 0 ? (
                              <div className="event-line">No recent events.</div>
                            ) : (
                              eventsByUser[user.id].map(event => (
                                <div className="event-line" key={`${event.created_at}-${event.event}`}>
                                  <strong>{event.event}</strong>
                                  <span>{eventLabel(event)}</span>
                                  <em>{fmtDateTime(event.created_at)}</em>
                                </div>
                              ))
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

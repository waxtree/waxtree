import { useCallback, useEffect, useState } from 'react';
import { ThemeFrame, useTheme } from '@/components/AppChrome';
import { MessagesSection } from '@/components/admin/MessagesSection';
import { ReplaysSection } from '@/components/admin/ReplaysSection';
import { StatsSection } from '@/components/admin/StatsSection';
import { UsersTable } from '@/components/admin/UsersTable';
import { authedFetch } from '@/lib/admin';
import { supabase } from '@/lib/supabase';

export const AdminPage = () => {
  const [theme] = useTheme();
  const [status, setStatus] = useState('loading');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [events, setEvents] = useState({});
  const [busyUser, setBusyUser] = useState(null);
  // Kept separate from `status` on purpose — Sentry being slow/misconfigured
  // shouldn't block the rest of the dashboard (stats/users) from loading.
  const [replays, setReplays] = useState({ loading: true });
  // Same idea: the inbox loads on its own and can't block the rest.
  const [messages, setMessages] = useState({ loading: true });
  const [busyMessage, setBusyMessage] = useState(null);

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
      authedFetch('/api/admin-messages')
        .then(async response => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          setMessages({ items: payload.messages, missingTable: !!payload.missingTable });
        })
        .catch(error => setMessages({ error: error.message }));
      try {
        const replaysResponse = await authedFetch('/api/admin-replays');
        if (!replaysResponse.ok) throw new Error((await replaysResponse.json().catch(() => ({}))).error || `HTTP ${replaysResponse.status}`);
        setReplays({ items: (await replaysResponse.json()).replays });
      } catch (error) {
        setReplays({ error: error.message });
      }
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

  const toggleRead = async message => {
    const read = !message.read_at;
    setBusyMessage(message.id);
    try {
      const response = await authedFetch('/api/admin-messages', { method: 'POST', body: JSON.stringify({ id: message.id, read }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`);
      setMessages(current => ({ ...current, items: current.items.map(item => (item.id === message.id ? { ...item, read_at: read ? new Date().toISOString() : null } : item)) }));
    } catch (error) {
      alert(`Failed to update the message: ${error.message}`);
    } finally {
      setBusyMessage(null);
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
        <p className="mt-1 text-xs text-muted-foreground">Internal only. Not linked from the app.</p>

        {status !== 'ready' ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6 text-muted-foreground">
            {status === 'loading' && 'Loading…'}
            {status === 'unauthorized' && 'Not authorized.'}
            {status === 'failed' && 'Failed to load — try reloading.'}
            {status.startsWith('error:') && `Error: ${status.slice(6)}`}
          </div>
        ) : (
          <>
            <MessagesSection state={messages} busyMessage={busyMessage} onToggleRead={toggleRead} />
            <StatsSection stats={stats} />
            <UsersTable users={users} expanded={expanded} events={events} busyUser={busyUser} onExpand={toggleEvents} onToggle={toggleUser} />
            <ReplaysSection state={replays} />
          </>
        )}
      </main>
    </ThemeFrame>
  );
};

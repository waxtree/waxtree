import { FREQUENCY_OPTIONS, ROLE_OPTIONS } from '@/lib/onboardingContent';
import { supabase } from '@/lib/supabase';

export const fmtDate = value =>
  value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const fmtDateTime = value => {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

export const fmtDuration = seconds => {
  if (!seconds && seconds !== 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Onboarding answers as the app itself words them ("DJ / Producer", "Weekly").
export const roleLabel = value => ROLE_OPTIONS.find(option => option.value === value)?.title || value || null;
export const frequencyLabel = value => FREQUENCY_OPTIONS.find(option => option.value === value)?.title || value || null;

export const authedFetch = async (path, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('no session');
  return fetch(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  });
};

export const describeEvent = event => {
  const payload = event.payload || {};
  switch (event.event) {
    case 'explore': return `${payload.type || ''}: ${payload.name || ''}${payload.parent_name ? ` (from ${payload.parent_name})` : ''}`;
    case 'play': return `${payload.artist || ''} – ${payload.title || ''}${payload.genre ? ` · ${payload.genre}` : ''}`;
    case 'like':
    case 'queue': return `${payload.artist || ''} – ${payload.title || ''}`;
    case 'follow': return `${payload.type || ''}: ${payload.name || ''}`;
    default: return JSON.stringify(payload);
  }
};

import { requireAdmin, setCors } from './_admin.js'

// Session Replay lives entirely in Sentry, not Supabase — this just proxies
// a read through our own admin auth so the dashboard doesn't need a second
// login, and never exposes SENTRY_AUTH_TOKEN to the browser. See
// src/components/AppChrome.jsx's loadSentry() for what actually records
// these (the admin's own account is excluded there, and filtered again
// below in case any of its sessions were captured before that shipped).
const SENTRY_ORG = 'waxttree'
const SENTRY_PROJECT_ID = '4511727608987728'
const ADMIN_EMAIL = 'navi.avinn@gmail.com'

// GET /api/admin-replays — most recent Session Replay recordings.
export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const token = process.env.SENTRY_AUTH_TOKEN
  if (!token) return res.status(503).json({ error: 'Sentry replay lookup not configured — add SENTRY_AUTH_TOKEN to Vercel env vars' })

  try {
    const url = new URL(`https://sentry.io/api/0/organizations/${SENTRY_ORG}/replays/`)
    url.searchParams.set('project', SENTRY_PROJECT_ID)
    url.searchParams.set('per_page', '25')
    url.searchParams.set('sort', '-started_at')
    ;['id', 'started_at', 'finished_at', 'duration', 'user', 'count_errors', 'urls'].forEach(field => url.searchParams.append('field', field))

    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) return res.status(r.status).json({ error: `Sentry ${r.status}: ${await r.text()}` })
    const json = await r.json()

    const replays = (json.data || [])
      .filter(item => item.user?.email !== ADMIN_EMAIL)
      .map(item => ({
        id: item.id,
        startedAt: item.started_at,
        durationSec: item.duration,
        userEmail: item.user?.email || item.user?.username || null,
        errorCount: item.count_errors || 0,
        firstUrl: item.urls?.[0] || null,
        replayUrl: `https://${SENTRY_ORG}.sentry.io/replays/${item.id}/`,
      }))

    return res.status(200).json({ replays })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

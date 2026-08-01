import { requireAdmin, sbAdmin, setCors } from './_admin.js'

// GET /api/admin-user-events?user_id=... — a single user's recent digging
// events (explore/play/like/follow/queue), newest first. Powers the
// expandable row in the admin Users table — fetched on demand per user
// rather than joined into admin-stats/admin-users, since most rows never
// get expanded.
export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const userId = req.query.user_id
  if (!userId) return res.status(400).json({ error: 'missing user_id' })

  try {
    const r = await sbAdmin(`/rest/v1/digging_events?user_id=eq.${encodeURIComponent(userId)}&select=event,payload,created_at&order=created_at.desc&limit=100`)
    if (!r.ok) return res.status(502).json({ error: 'failed to load events', detail: await r.text() })
    const events = await r.json()
    return res.status(200).json({ events })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

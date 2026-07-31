import { requireAdmin, sbAdmin, setCors } from './_admin.js'

// PostgREST returns an exact row count in the Content-Range response
// header on a HEAD request with Prefer: count=exact — no rows are ever
// transferred, just the count. `query` is anything after the table name,
// e.g. '?video_id=not.is.null'.
async function countRows(table, query = '') {
  const r = await sbAdmin(`/rest/v1/${table}${query}`, {
    method: 'HEAD',
    headers: { Prefer: 'count=exact' },
  })
  const range = r.headers.get('content-range') || ''
  const total = range.split('/')[1]
  return total && total !== '*' ? Number(total) : 0
}

// GET /api/admin-stats — app-wide usage numbers for the dashboard.
export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const admin = await requireAdmin(req, res)
  if (!admin) return

  try {
    const usersRes = await sbAdmin('/auth/v1/admin/users?per_page=200')
    const usersBody = usersRes.ok ? await usersRes.json() : { users: [] }
    const users = Array.isArray(usersBody) ? usersBody : (usersBody.users || [])
    const totalUsers = users.length
    const premiumUsers = users.filter(u => u.user_metadata?.premium === true).length

    // digging_events is small enough today (see supabase/digging_events.sql's
    // own note) to just fetch and count by type in JS. Move this to a
    // Postgres view/RPC once it's grown past a few thousand rows.
    const eventsRes = await sbAdmin('/rest/v1/digging_events?select=event,created_at&order=created_at.desc&limit=5000')
    const events = eventsRes.ok ? await eventsRes.json() : []
    const eventsByType = {}
    const cutoff7d = Date.now() - 7 * 24 * 60 * 60 * 1000
    let events7d = 0
    for (const e of events) {
      eventsByType[e.event] = (eventsByType[e.event] || 0) + 1
      if (new Date(e.created_at).getTime() >= cutoff7d) events7d++
    }

    const [discogsCache, ytMatched, ytNoMatch, ytChannels, sessions, trees, nodes] = await Promise.all([
      countRows('discogs_node_cache'),
      countRows('yt_video_matches', '?video_id=not.is.null'),
      countRows('yt_video_matches', '?video_id=is.null'),
      countRows('yt_channel_matches'),
      countRows('sessions'),
      countRows('trees'),
      countRows('nodes'),
    ])

    return res.status(200).json({
      users: { total: totalUsers, premium: premiumUsers, free: totalUsers - premiumUsers },
      digging_events: { total: events.length, by_type: eventsByType, last_7_days: events7d },
      shared_caches: {
        discogs_node_cache: discogsCache,
        yt_video_matches_found: ytMatched,
        yt_video_matches_confirmed_none: ytNoMatch,
        yt_channel_matches: ytChannels,
      },
      new_schema: { sessions, trees, nodes },
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

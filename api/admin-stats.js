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

    const now = Date.now()
    const cutoff7d = now - 7 * 24 * 60 * 60 * 1000
    const cutoff30d = now - 30 * 24 * 60 * 60 * 1000

    // Signups per day for the last 30 days, zero-filled so a quiet day
    // still shows as a real 0 bar rather than being absent entirely.
    const signupsByDay = {}
    for (let i = 29; i >= 0; i--) {
      signupsByDay[new Date(now - i * 86400000).toISOString().slice(0, 10)] = 0
    }
    users.forEach(u => {
      const d = (u.created_at || '').slice(0, 10)
      if (d in signupsByDay) signupsByDay[d]++
    })

    // digging_events is small enough today (see supabase/digging_events.sql's
    // own note) to just fetch and count by type in JS. Move this to a
    // Postgres view/RPC once it's grown past a few thousand rows.
    const eventsRes = await sbAdmin('/rest/v1/digging_events?select=user_id,event,payload,created_at&order=created_at.desc&limit=5000')
    const events = eventsRes.ok ? await eventsRes.json() : []
    const eventsByType = {}
    let events7d = 0
    // 'play' events carry the real Discogs genre/style string of whatever
    // was playing.
    const genreCounts = {}
    const lastEventById = {}
    for (const e of events) {
      eventsByType[e.event] = (eventsByType[e.event] || 0) + 1
      if (new Date(e.created_at).getTime() >= cutoff7d) events7d++
      if (!lastEventById[e.user_id]) lastEventById[e.user_id] = e.created_at // first hit per user is the newest — already ordered desc
      if (e.event === 'play' && e.payload?.genre) {
        String(e.payload.genre).split('·').forEach(g => {
          g = g.trim()
          if (g) genreCounts[g] = (genreCounts[g] || 0) + 1
        })
      }
    }
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([genre, count]) => ({ genre, count }))

    // "Active" here means "Last active" per admin-users.js's own definition
    // (max of last real sign-in, last state sync, last tracked event) — a
    // user who's stayed signed in for weeks without a fresh login shouldn't
    // read as inactive just because GoTrue's own last_sign_in_at is stale.
    const stateRes = await sbAdmin('/rest/v1/user_state?select=user_id,updated_at')
    const states = stateRes.ok ? await stateRes.json() : []
    const stateUpdatedById = Object.fromEntries(states.map(s => [s.user_id, s.updated_at]))
    let active7d = 0, active30d = 0
    for (const u of users) {
      const candidates = [u.last_sign_in_at, stateUpdatedById[u.id], lastEventById[u.id]].filter(Boolean)
      if (!candidates.length) continue
      const lastActiveMs = Math.max(...candidates.map(c => new Date(c).getTime()))
      if (lastActiveMs >= cutoff7d) active7d++
      if (lastActiveMs >= cutoff30d) active30d++
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
      users: { total: totalUsers, premium: premiumUsers, free: totalUsers - premiumUsers, active_7d: active7d, active_30d: active30d },
      signups_by_day: signupsByDay,
      digging_events: { total: events.length, by_type: eventsByType, last_7_days: events7d },
      top_genres: topGenres,
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

import { requireAdmin, sbAdmin, setCors } from './_admin.js'

// GET /api/admin-users — every registered user, with the REAL premium flag
// (user_metadata.premium, not profiles.tier — see admin.html/plan notes on
// why) plus profiles.tier alongside it as a cross-check: a mismatch flags a
// user whose syncNewSchema() dual-write never caught up.
export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const admin = await requireAdmin(req, res)
  if (!admin) return

  try {
    // 200 covers today's user count with a lot of headroom; real
    // pagination (GoTrue's next_page cursor) is worth adding once this
    // project has enough users for one page to not be everyone.
    const usersRes = await sbAdmin('/auth/v1/admin/users?per_page=200')
    if (!usersRes.ok) return res.status(502).json({ error: 'failed to list users', detail: await usersRes.text() })
    const usersBody = await usersRes.json()
    const users = Array.isArray(usersBody) ? usersBody : (usersBody.users || [])

    const profilesRes = await sbAdmin('/rest/v1/profiles?select=id,tier')
    const profiles = profilesRes.ok ? await profilesRes.json() : []
    const tierById = Object.fromEntries(profiles.map(p => [p.id, p.tier]))

    // user_state.data.nodes is each user's actual saved tree (see
    // preview.html's saveSt/pushStateToCloud) — counting it directly is
    // more reliable than tallying 'explore' digging_events, since a node
    // stays counted here even if it was added before digging_events
    // shipped, or its own logEvent batch got dropped client-side.
    // updated_at on the same row doubles as an activity signal below —
    // pushStateToCloud() upserts it on nearly every interaction (search,
    // opening a node, playing something...), not just an actual login.
    const stateRes = await sbAdmin('/rest/v1/user_state?select=user_id,data,updated_at')
    const states = stateRes.ok ? await stateRes.json() : []
    const nodesCountById = Object.fromEntries(states.map(s => [s.user_id, (s.data?.nodes || []).length]))
    const stateUpdatedById = Object.fromEntries(states.map(s => [s.user_id, s.updated_at]))

    // GoTrue's last_sign_in_at only moves on an actual (re)login — a user
    // who's stayed signed in for weeks, just reloading and searching, still
    // shows their last real sign-in date there, which reads as "inactive"
    // when they're not. "Last active" below is the max of every activity
    // signal we have instead: the last real sign-in, the last state sync
    // (fires on almost any interaction), and the last tracked digging event.
    const eventsRes = await sbAdmin('/rest/v1/digging_events?select=user_id,created_at&order=created_at.desc&limit=5000')
    const events = eventsRes.ok ? await eventsRes.json() : []
    const lastEventById = {}
    for (const e of events) {
      if (!lastEventById[e.user_id]) lastEventById[e.user_id] = e.created_at // first hit per user is the newest — already ordered desc
    }

    const rows = users.map(u => {
      const candidates = [u.last_sign_in_at, stateUpdatedById[u.id], lastEventById[u.id]].filter(Boolean)
      const lastActive = candidates.length
        ? candidates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
        : null
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_active: lastActive,
        premium: u.user_metadata?.premium === true,
        profiles_tier: tierById[u.id] ?? null,
        library_track_count: u.user_metadata?.library_track_count ?? null,
        search_count: u.user_metadata?.search_count ?? null,
        nodes_count: nodesCountById[u.id] ?? 0,
      }
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return res.status(200).json({ users: rows })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

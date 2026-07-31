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

    const rows = users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      premium: u.user_metadata?.premium === true,
      profiles_tier: tierById[u.id] ?? null,
      library_track_count: u.user_metadata?.library_track_count ?? null,
      search_count: u.user_metadata?.search_count ?? null,
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return res.status(200).json({ users: rows })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

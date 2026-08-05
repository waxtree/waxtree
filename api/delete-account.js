import { sbAdmin, setCors } from './_admin.js'

const SB_URL = 'https://asmnqlqvlpcwcaaughuu.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SERVICE_KEY) return res.status(503).json({ error: 'delete-account not configured (missing SUPABASE_SERVICE_ROLE_KEY)' })

  const auth = req.headers.authorization || ''
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!jwt) return res.status(401).json({ error: 'missing token' })

  // Verifies the caller's OWN session and deletes exactly that account —
  // never a user id taken from the request body, so there's no way for
  // this endpoint to be used to target anyone else's account, even by a
  // malformed or malicious client request.
  const who = await fetch(SB_URL + '/auth/v1/user', {
    headers: { Authorization: `Bearer ${jwt}`, apikey: SERVICE_KEY },
  })
  if (!who.ok) return res.status(401).json({ error: 'invalid session' })
  const user = await who.json()

  // Deleting the auth.users row cascades through every table that
  // references it — user_state, user_state_history, digging_events,
  // profiles/sessions/trees/nodes, admin_audit_log (see each schema
  // file's own "on delete cascade", and admin_audit_log_cascade.sql for
  // the one table that needed a migration to join them) — so this single
  // call is genuinely sufficient, not just the auth half of a two-step
  // cleanup a caller would need to remember to also do elsewhere.
  const del = await sbAdmin(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' })
  if (!del.ok) {
    const body = await del.json().catch(() => ({}))
    return res.status(del.status).json({ error: body.msg || body.error_description || 'Delete failed' })
  }
  return res.status(200).json({ success: true })
}

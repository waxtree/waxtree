import { requireAdmin, sbAdmin, setCors } from './_admin.js'

// GET  /api/admin-messages — latest "Contact us" messages, newest first, with
//      each sender's real email/username looked up by user_id (never trusted
//      from the client).
// POST /api/admin-messages { id, read } — mark one message read / unread.
export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const admin = await requireAdmin(req, res)
  if (!admin) return

  try {
    if (req.method === 'POST') {
      const { id, read } = req.body || {}
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'id must be an integer' })
      const r = await sbAdmin(`/rest/v1/contact_messages?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ read_at: read ? new Date().toISOString() : null }),
      })
      if (!r.ok) return res.status(502).json({ error: 'failed to update message', detail: await r.text() })
      return res.status(200).json({ ok: true })
    }

    const messagesRes = await sbAdmin('/rest/v1/contact_messages?select=id,user_id,kind,message,page,created_at,read_at&order=created_at.desc&limit=300')
    if (!messagesRes.ok) {
      const detail = await messagesRes.text()
      // Table not created yet (contact_messages.sql not run) — say so plainly.
      if (messagesRes.status === 404 || detail.includes('contact_messages')) return res.status(200).json({ messages: [], missingTable: true })
      return res.status(502).json({ error: 'failed to list messages', detail })
    }
    const messages = await messagesRes.json()

    const usersRes = await sbAdmin('/auth/v1/admin/users?per_page=200')
    const usersBody = usersRes.ok ? await usersRes.json() : { users: [] }
    const users = Array.isArray(usersBody) ? usersBody : (usersBody.users || [])
    const byId = Object.fromEntries(users.map(u => [u.id, u]))

    return res.status(200).json({
      messages: messages.map(m => ({
        ...m,
        email: byId[m.user_id]?.email || null,
        username: byId[m.user_id]?.user_metadata?.username || null,
      })),
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

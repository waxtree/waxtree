import { requireAdmin, sbAdmin, setCors } from './_admin.js'

// POST /api/admin-set-premium  { user_id, premium }
//
// The app's real premium flag is user_metadata.premium (see preview.html's
// own st.isPremium = wtSession.user.user_metadata?.premium===true) — NOT
// public.profiles.tier, which a different in-progress migration mirrors
// but which preview.html's own comment says is "not authoritative". GoTrue's
// admin update REPLACES user_metadata wholesale, not a deep merge — that
// field also carries owned_tracks/library_track_count/search_count/username,
// so this always fetches the current object and spreads over it rather than
// ever sending a bare {premium} object, or a toggle here would silently wipe
// a user's local-library-scan state.
export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const { user_id, premium } = req.body || {}
  if (!user_id || typeof premium !== 'boolean') {
    return res.status(400).json({ error: 'user_id (string) and premium (boolean) required' })
  }

  try {
    const getRes = await sbAdmin('/auth/v1/admin/users/' + encodeURIComponent(user_id))
    if (!getRes.ok) return res.status(404).json({ error: 'user not found' })
    const target = await getRes.json()
    const oldMeta = target.user_metadata || {}
    if (oldMeta.premium === premium) {
      return res.status(200).json({ ok: true, unchanged: true })
    }
    const newMeta = { ...oldMeta, premium }

    const putRes = await sbAdmin('/auth/v1/admin/users/' + encodeURIComponent(user_id), {
      method: 'PUT',
      body: JSON.stringify({ user_metadata: newMeta }),
    })
    if (!putRes.ok) return res.status(502).json({ error: 'update failed', detail: await putRes.text() })

    // Best-effort — the tier change itself already succeeded above; a
    // failed audit-log write shouldn't be reported as the change failing.
    try {
      await sbAdmin('/rest/v1/admin_audit_log', {
        method: 'POST',
        body: JSON.stringify({
          admin_id: admin.id,
          target_user_id: user_id,
          action: 'set_premium',
          old_value: { premium: oldMeta.premium === true },
          new_value: { premium },
        }),
      })
    } catch (e) {
      console.warn('admin_audit_log write failed (non-fatal):', e)
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

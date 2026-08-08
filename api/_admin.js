// Shared by every api/admin-*.js endpoint — NOT a route itself (Vercel
// excludes files prefixed with "_" from routing). Raw fetch against
// Supabase's own HTTP APIs, no SDK: matches api/discogs-oauth.js and
// api/yt-search.js, which both call their target API directly with fetch
// and zero npm imports — vercel.json has an empty installCommand and
// there's no node_modules/ in the repo, so that's clearly an intentional
// zero-install deploy model, not an oversight worth breaking here.
const SB_URL = 'https://asmnqlqvlpcwcaaughuu.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function allowlist() {
  // Fail CLOSED on a missing/empty env var — never fall through to "allow
  // everyone" just because ADMIN_USER_IDS wasn't set yet.
  return new Set((process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean))
}

// Verifies the caller's own Supabase session JWT (sent as a normal
// Authorization: Bearer header by the React admin route, exactly like the app
// does everywhere else) and checks the resulting user id against the
// allowlist. Returns the verified user object on success; on failure it
// sends the error response itself and returns null, so every handler can
// just do `const admin = await requireAdmin(req,res); if (!admin) return;`.
export async function requireAdmin(req, res) {
  if (!SERVICE_KEY) {
    res.status(503).json({ error: 'admin backend not configured (missing SUPABASE_SERVICE_ROLE_KEY)' })
    return null
  }
  const auth = req.headers.authorization || ''
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!jwt) {
    res.status(401).json({ error: 'missing token' })
    return null
  }

  const allowed = allowlist()
  if (allowed.size === 0) {
    res.status(503).json({ error: 'admin allowlist not configured' })
    return null
  }

  const r = await fetch(SB_URL + '/auth/v1/user', {
    headers: { Authorization: `Bearer ${jwt}`, apikey: SERVICE_KEY },
  })
  if (!r.ok) {
    res.status(401).json({ error: 'invalid session' })
    return null
  }
  const user = await r.json()

  if (!allowed.has(user.id)) {
    res.status(403).json({ error: 'forbidden' })
    return null
  }
  return user
}

// Thin fetch wrapper pre-loaded with the service-role key, for privileged
// calls (GoTrue admin endpoints, or PostgREST table reads/writes that need
// to bypass RLS). Never expose SERVICE_KEY itself in a response body.
export async function sbAdmin(path, opts = {}) {
  return fetch(SB_URL + path, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

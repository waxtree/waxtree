const COSINE_API_KEY = process.env.COSINE_API_KEY ?? ''
const COSINE_BASE = 'https://cosine.club/api/v1'
const UA = 'WaxTree/1.0 (https://waxtree.vercel.app)' // redeploy to pick up new COSINE_API_KEY

async function cosineFetch(path, params) {
  const url = new URL(COSINE_BASE + path)
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') url.searchParams.set(k, String(v)) })
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${COSINE_API_KEY}`, 'User-Agent': UA, Accept: 'application/json' },
  })
  const body = await r.json().catch(() => null)
  if (!r.ok) {
    const err = new Error(`Cosine ${r.status}${body?.error ? `: ${body.error}` : ''}`)
    err.status = r.status
    throw err
  }
  return body
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!COSINE_API_KEY) return res.status(503).json({ error: 'Cosine.club not configured — add COSINE_API_KEY to Vercel env vars' })

  const params = req.method === 'GET' ? req.query : (req.body || {})
  const action = params.action || 'search'

  try {
    // Look up WaxTree's own currently-playing track (a Discogs release
    // URL, or a YouTube video URL for an auto-matched track) to get
    // Cosine's internal id for it, which /similar below needs.
    if (action === 'lookup') {
      if (!params.url) return res.status(400).json({ error: 'Missing url' })
      const data = await cosineFetch('/tracks/lookup', { url: params.url })
      return res.status(200).json(data)
    }
    if (action === 'similar') {
      if (!params.id) return res.status(400).json({ error: 'Missing id' })
      const data = await cosineFetch(`/tracks/${encodeURIComponent(params.id)}/similar`, { limit: params.limit || 20 })
      return res.status(200).json(data)
    }
    if (action === 'search') {
      if (!params.q) return res.status(400).json({ error: 'Missing q' })
      const data = await cosineFetch('/search', { q: params.q })
      return res.status(200).json(data)
    }
    return res.status(400).json({ error: 'Unknown action' })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message })
  }
}

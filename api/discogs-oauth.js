const ck = process.env.DISCOGS_CONSUMER_KEY ?? ''
const cs = process.env.DISCOGS_CONSUMER_SECRET ?? ''
const UA = 'WaxTree/1.0 (luca.doots@gmail.com)'

// Optional pool of personal Discogs access tokens (comma-separated),
// contributed by whoever wants to lend WaxTree some of their own Discogs
// rate-limit headroom. Each personal token gets its own independent quota
// from Discogs (separate from the shared app-level consumer-key quota the
// 'search' action falls back to below), so every token added here is real
// extra throughput, not a bigger slice of the same one. Picked at random
// per request rather than round-robined — serverless invocations don't
// share memory, so there's no reliable place to track "whose turn is it"
// across them without another moving part; random spreads load evenly
// enough across the pool without needing one. Empty/unset = falls back to
// the original single shared consumer-key behavior, unchanged.
const tokenPool = (process.env.DISCOGS_TOKEN_POOL ?? '').split(',').map(t => t.trim()).filter(Boolean)
function pickPooledToken() {
  if (!tokenPool.length) return null
  return tokenPool[Math.floor(Math.random() * tokenPool.length)]
}

function nonce() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
function ts() {
  return String(Math.floor(Date.now() / 1000))
}
function oauthHeader(params) {
  return 'OAuth ' + Object.entries(params).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(',')
}
async function discogsReq(url, method, token, tokenSecret) {
  const sig = `${encodeURIComponent(cs)}&${encodeURIComponent(tokenSecret)}`
  return fetch(url, {
    method,
    headers: {
      Authorization: oauthHeader({ oauth_consumer_key: ck, oauth_token: token, oauth_signature_method: 'PLAINTEXT', oauth_timestamp: ts(), oauth_nonce: nonce(), oauth_version: '1.0', oauth_signature: sig }),
      'User-Agent': UA,
    },
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!ck || !cs) return res.status(503).json({ error: 'Discogs OAuth not configured — add DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET to Vercel env vars' })

  const body = req.body
  const { action } = body

  // ── Step 1: request token ─────────────────────────────────
  if (action === 'request_token') {
    const sig = `${encodeURIComponent(cs)}&`
    const r = await fetch('https://api.discogs.com/oauth/request_token', {
      method: 'GET',
      headers: {
        Authorization: oauthHeader({ oauth_consumer_key: ck, oauth_signature_method: 'PLAINTEXT', oauth_timestamp: ts(), oauth_nonce: nonce(), oauth_version: '1.0', oauth_signature: sig, oauth_callback: body.callback_url }),
        'User-Agent': UA,
      },
    })
    if (!r.ok) return res.status(400).json({ error: `Discogs ${r.status}: ${await r.text()}` })
    const p = Object.fromEntries(new URLSearchParams(await r.text()))
    return res.status(200).json({ oauth_token: p.oauth_token, oauth_token_secret: p.oauth_token_secret })
  }

  // ── Step 2: access token + identity ──────────────────────
  if (action === 'access_token') {
    const { oauth_token, oauth_token_secret, oauth_verifier } = body
    const sig = `${encodeURIComponent(cs)}&${encodeURIComponent(oauth_token_secret)}`
    const r = await fetch('https://api.discogs.com/oauth/access_token', {
      method: 'POST',
      headers: {
        Authorization: oauthHeader({ oauth_consumer_key: ck, oauth_token, oauth_verifier, oauth_signature_method: 'PLAINTEXT', oauth_timestamp: ts(), oauth_nonce: nonce(), oauth_version: '1.0', oauth_signature: sig }),
        'User-Agent': UA,
      },
    })
    if (!r.ok) return res.status(400).json({ error: `Token exchange failed (${r.status}): ${await r.text()}` })
    const p = Object.fromEntries(new URLSearchParams(await r.text()))
    const accessToken = p.oauth_token
    const tokenSecret = p.oauth_token_secret
    const idRes = await discogsReq('https://api.discogs.com/oauth/identity', 'GET', accessToken, tokenSecret)
    if (!idRes.ok) return res.status(400).json({ error: `Identity failed: ${idRes.status}` })
    const identity = await idRes.json()
    return res.status(200).json({ access_token: accessToken, token_secret: tokenSecret, username: identity.username })
  }

  // ── Step 3: proxy Discogs requests with OAuth signing ─────
  if (action === 'proxy') {
    const { path, params, access_token, token_secret } = body
    const url = new URL('https://api.discogs.com' + path)
    if (params) {
      const p = typeof params === 'string' ? JSON.parse(params) : params
      Object.entries(p).forEach(([k, v]) => url.searchParams.set(k, String(v)))
    }
    const r = await discogsReq(url.toString(), 'GET', access_token, token_secret)
    if (r.status === 429) return res.status(429).json({ error: 'rate_limited' })
    if (!r.ok) return res.status(400).json({ error: `Discogs ${r.status}` })
    return res.status(200).json(await r.json())
  }

  // ── Search: app-level auth, or a pooled personal token if any are configured ─────────
  if (action === 'search') {
    const { path, params } = body
    const url = new URL('https://api.discogs.com' + path)
    if (params) {
      const p = typeof params === 'string' ? JSON.parse(params) : params
      Object.entries(p).forEach(([k, v]) => url.searchParams.set(k, String(v)))
    }
    const pooled = pickPooledToken()
    const r = await fetch(url.toString(), {
      headers: {
        Authorization: pooled ? `Discogs token=${pooled}` : `Discogs key=${ck},secret=${cs}`,
        'User-Agent': UA,
      },
    })
    if (r.status === 429) return res.status(429).json({ error: 'rate_limited' })
    if (!r.ok) return res.status(400).json({ error: `Discogs ${r.status}` })
    return res.status(200).json(await r.json())
  }

  return res.status(400).json({ error: 'Unknown action' })
}

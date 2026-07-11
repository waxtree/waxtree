const ck = Deno.env.get('DISCOGS_CONSUMER_KEY') ?? ''
const cs = Deno.env.get('DISCOGS_CONSUMER_SECRET') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const UA = 'WaxTree/1.0 (luca.doots@gmail.com)'

function nonce() {
  return crypto.randomUUID().replace(/-/g, '')
}

function ts() {
  return String(Math.floor(Date.now() / 1000))
}

function oauthHeader(params: Record<string, string>) {
  const parts = Object.entries(params)
    .map(([k, v]) => `${k}="${encodeURIComponent(v)}"`)
    .join(',')
  return `OAuth ${parts}`
}

async function discogsReq(
  url: string,
  method: string,
  token: string,
  tokenSecret: string,
  extra: Record<string, string> = {},
): Promise<Response> {
  const sig = `${encodeURIComponent(cs)}&${encodeURIComponent(tokenSecret)}`
  const headers = {
    Authorization: oauthHeader({
      oauth_consumer_key: ck,
      oauth_token: token,
      oauth_signature_method: 'PLAINTEXT',
      oauth_timestamp: ts(),
      oauth_nonce: nonce(),
      oauth_version: '1.0',
      oauth_signature: sig,
      ...extra,
    }),
    'User-Agent': UA,
  }
  return fetch(url, { method, headers })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!ck || !cs) {
    return respond(
      { error: 'Discogs OAuth not configured. Add DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET to Supabase secrets.' },
      503,
    )
  }

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return respond({ error: 'Invalid JSON' }, 400)
  }

  const { action } = body

  // ── Step 1: get request token ──────────────────────────────
  if (action === 'request_token') {
    const { callback_url } = body
    if (!callback_url) return respond({ error: 'callback_url required' }, 400)

    const sig = `${encodeURIComponent(cs)}&`
    const res = await fetch('https://api.discogs.com/oauth/request_token', {
      method: 'GET',
      headers: {
        Authorization: oauthHeader({
          oauth_consumer_key: ck,
          oauth_signature_method: 'PLAINTEXT',
          oauth_timestamp: ts(),
          oauth_nonce: nonce(),
          oauth_version: '1.0',
          oauth_signature: sig,
          oauth_callback: callback_url,
        }),
        'User-Agent': UA,
      },
    })

    if (!res.ok) return respond({ error: `Discogs ${res.status}: ${await res.text()}` }, 400)
    const p = Object.fromEntries(new URLSearchParams(await res.text()))
    return respond({ oauth_token: p.oauth_token, oauth_token_secret: p.oauth_token_secret })
  }

  // ── Step 2: exchange verifier → access token + identity ───
  if (action === 'access_token') {
    const { oauth_token, oauth_token_secret, oauth_verifier } = body
    if (!oauth_token || !oauth_token_secret || !oauth_verifier)
      return respond({ error: 'oauth_token, oauth_token_secret, oauth_verifier required' }, 400)

    const sig = `${encodeURIComponent(cs)}&${encodeURIComponent(oauth_token_secret)}`
    const res = await fetch('https://api.discogs.com/oauth/access_token', {
      method: 'POST',
      headers: {
        Authorization: oauthHeader({
          oauth_consumer_key: ck,
          oauth_token,
          oauth_verifier,
          oauth_signature_method: 'PLAINTEXT',
          oauth_timestamp: ts(),
          oauth_nonce: nonce(),
          oauth_version: '1.0',
          oauth_signature: sig,
        }),
        'User-Agent': UA,
      },
    })

    if (!res.ok) return respond({ error: `Token exchange failed (${res.status}): ${await res.text()}` }, 400)

    const p = Object.fromEntries(new URLSearchParams(await res.text()))
    const accessToken = p.oauth_token
    const tokenSecret = p.oauth_token_secret

    const idRes = await discogsReq('https://api.discogs.com/oauth/identity', 'GET', accessToken, tokenSecret)
    if (!idRes.ok) return respond({ error: `Identity fetch failed: ${idRes.status}` }, 400)
    const identity = await idRes.json()

    return respond({ access_token: accessToken, token_secret: tokenSecret, username: identity.username })
  }

  // ── Step 3: proxy OAuth-signed Discogs requests ───────────
  if (action === 'proxy') {
    const { path, params, access_token, token_secret } = body
    if (!path || !access_token || !token_secret)
      return respond({ error: 'path, access_token, token_secret required' }, 400)

    const url = new URL('https://api.discogs.com' + path)
    if (params) {
      let p: Record<string, string>
      try { p = typeof params === 'string' ? JSON.parse(params) : params } catch { p = {} }
      Object.entries(p).forEach(([k, v]) => url.searchParams.set(k, String(v)))
    }

    const res = await discogsReq(url.toString(), 'GET', access_token, token_secret)

    if (res.status === 429) return respond({ error: 'rate_limited' }, 429)
    if (!res.ok) return respond({ error: `Discogs ${res.status}` }, 400)
    return respond(await res.json())
  }

  return respond({ error: 'Unknown action' }, 400)
})

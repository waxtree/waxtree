const YT_API_KEY = process.env.YOUTUBE_API_KEY ?? ''

function parseIso8601Duration(iso) {
  const m = (iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  const h = parseInt(m[1] || '0', 10)
  const mi = parseInt(m[2] || '0', 10)
  const s = parseInt(m[3] || '0', 10)
  return h * 3600 + mi * 60 + s
}

async function ytFetch(url) {
  const r = await fetch(url)
  if (!r.ok) {
    const body = await r.json().catch(() => null)
    const reason = body?.error?.errors?.[0]?.reason || body?.error?.status || ''
    const err = new Error(`YouTube ${r.status}${reason ? ` (${reason})` : ''}`)
    err.status = r.status
    throw err
  }
  return r.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!YT_API_KEY) return res.status(503).json({ error: 'YouTube search not configured — add YOUTUBE_API_KEY to Vercel env vars' })

  const params = req.method === 'GET' ? req.query : (req.body || {})
  const channelId = params.channelId || ''
  const q = params.q || ''

  try {
    // Cheap path (~3 units total, no search.list quota spent at all): once a
    // track has already confirmed an artist's/label's channel once, list
    // that channel's own uploads instead of paying for another search.list
    // call (100 units, and YouTube caps that endpoint at only ~100/day —
    // by far the tightest constraint here, not the general unit budget).
    if (channelId) {
      const chUrl = new URL('https://www.googleapis.com/youtube/v3/channels')
      chUrl.searchParams.set('part', 'contentDetails')
      chUrl.searchParams.set('id', channelId)
      chUrl.searchParams.set('key', YT_API_KEY)
      const cd = await ytFetch(chUrl)
      const uploadsPlaylistId = cd.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
      if (!uploadsPlaylistId) return res.status(200).json({ results: [] })

      const plUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
      plUrl.searchParams.set('part', 'snippet')
      plUrl.searchParams.set('playlistId', uploadsPlaylistId)
      plUrl.searchParams.set('maxResults', '50')
      plUrl.searchParams.set('key', YT_API_KEY)
      const pd = await ytFetch(plUrl)
      const items = (pd.items || [])
        .map(it => ({
          id: it.snippet?.resourceId?.videoId,
          title: it.snippet?.title || '',
          channelTitle: it.snippet?.channelTitle || '',
          channelId,
        }))
        .filter(x => x.id)
      if (!items.length) return res.status(200).json({ results: [] })

      const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
      videosUrl.searchParams.set('part', 'contentDetails')
      videosUrl.searchParams.set('id', items.map(x => x.id).join(','))
      videosUrl.searchParams.set('key', YT_API_KEY)
      const vd = await ytFetch(videosUrl)
      const durById = {}
      ;(vd.items || []).forEach(v => { durById[v.id] = parseIso8601Duration(v.contentDetails?.duration) })
      const results = items.map(x => ({ ...x, durationSec: durById[x.id] || 0 }))
      return res.status(200).json({ results })
    }

    if (!q.trim()) return res.status(400).json({ error: 'Missing query' })

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('videoCategoryId', '10') // Music
    searchUrl.searchParams.set('maxResults', '8')
    searchUrl.searchParams.set('q', q)
    searchUrl.searchParams.set('key', YT_API_KEY)
    const sd = await ytFetch(searchUrl)
    const ids = (sd.items || []).map(it => it.id?.videoId).filter(Boolean)
    if (!ids.length) return res.status(200).json({ results: [] })

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    videosUrl.searchParams.set('part', 'contentDetails,snippet')
    videosUrl.searchParams.set('id', ids.join(','))
    videosUrl.searchParams.set('key', YT_API_KEY)
    const vd = await ytFetch(videosUrl)

    const results = (vd.items || []).map(v => ({
      id: v.id,
      title: v.snippet?.title || '',
      channelTitle: v.snippet?.channelTitle || '',
      channelId: v.snippet?.channelId || '',
      durationSec: parseIso8601Duration(v.contentDetails?.duration),
    }))
    return res.status(200).json({ results })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message })
  }
}

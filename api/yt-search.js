const YT_API_KEY = process.env.YOUTUBE_API_KEY ?? ''

function parseIso8601Duration(iso) {
  const m = (iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  const h = parseInt(m[1] || '0', 10)
  const mi = parseInt(m[2] || '0', 10)
  const s = parseInt(m[3] || '0', 10)
  return h * 3600 + mi * 60 + s
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!YT_API_KEY) return res.status(503).json({ error: 'YouTube search not configured — add YOUTUBE_API_KEY to Vercel env vars' })

  const q = (req.method === 'GET' ? req.query.q : req.body?.q) || ''
  if (!q.trim()) return res.status(400).json({ error: 'Missing query' })

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('videoCategoryId', '10') // Music
    searchUrl.searchParams.set('maxResults', '8')
    searchUrl.searchParams.set('q', q)
    searchUrl.searchParams.set('key', YT_API_KEY)
    const sr = await fetch(searchUrl)
    if (!sr.ok) return res.status(sr.status).json({ error: `YouTube search ${sr.status}` })
    const sd = await sr.json()
    const ids = (sd.items || []).map(it => it.id?.videoId).filter(Boolean)
    if (!ids.length) return res.status(200).json({ results: [] })

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    videosUrl.searchParams.set('part', 'contentDetails,snippet')
    videosUrl.searchParams.set('id', ids.join(','))
    videosUrl.searchParams.set('key', YT_API_KEY)
    const vr = await fetch(videosUrl)
    if (!vr.ok) return res.status(vr.status).json({ error: `YouTube videos ${vr.status}` })
    const vd = await vr.json()

    const results = (vd.items || []).map(v => ({
      id: v.id,
      title: v.snippet?.title || '',
      channelTitle: v.snippet?.channelTitle || '',
      channelId: v.snippet?.channelId || '',
      durationSec: parseIso8601Duration(v.contentDetails?.duration),
    }))
    return res.status(200).json({ results })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

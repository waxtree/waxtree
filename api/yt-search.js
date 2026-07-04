// Searches YouTube and returns the top video results (id, title, channel, length).
// No API key needed: parses the initial-data JSON embedded in the public
// search results page. Used by the mini player as a fallback when a track
// has no video in its Discogs data (self-releases etc.).
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const unesc = s => { try { return JSON.parse('"' + s + '"') } catch { return s } }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const q = (req.query.q || '').toString().trim().slice(0, 200)
  if (!q) return res.status(400).json({ error: 'missing q' })

  try {
    const r = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
    })
    if (!r.ok) throw new Error('YouTube returned ' + r.status)
    const html = await r.text()
    const results = []
    // Split per renderer, then extract each field independently — field order
    // inside the renderer JSON is not guaranteed, so one big regex is fragile.
    const chunks = html.split('"videoRenderer":').slice(1, 13)
    for (const c of chunks) {
      const id = (c.match(/^\{"videoId":"([\w-]{11})"/) || [])[1]
      if (!id) continue
      const title = (c.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/) || [])[1]
      const length = (c.match(/"lengthText":\{[^{}]*"simpleText":"([\d:]+)"/) || [])[1] || ''
      const channel = (c.match(/"ownerText":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/) || [])[1] || ''
      if (!title) continue
      results.push({ id, title: unesc(title), channel: unesc(channel), length })
      if (results.length >= 8) break
    }
    res.setHeader('Cache-Control', 's-maxage=86400')
    return res.status(200).json({ results })
  } catch (e) {
    return res.status(502).json({ error: 'YouTube search failed: ' + e.message })
  }
}

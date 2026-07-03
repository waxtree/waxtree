// Searches YouTube and returns the top video results (id + title).
// No API key needed: parses the initial-data JSON embedded in the public
// search results page. Used by the mini player as a fallback when a track
// has no video in its Discogs data (self-releases etc.).
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

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
    const re = /"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g
    let m
    while ((m = re.exec(html)) && results.length < 5) {
      let title = m[2]
      try { title = JSON.parse('"' + m[2] + '"') } catch {}
      results.push({ id: m[1], title })
    }
    res.setHeader('Cache-Control', 's-maxage=86400')
    return res.status(200).json({ results })
  } catch (e) {
    return res.status(502).json({ error: 'YouTube search failed: ' + e.message })
  }
}

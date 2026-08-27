const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// A real Beatport release/track page, not a search/genre/label listing page.
// Confirmed live 2026-08-04: beatport.com is a single shared domain (unlike
// Bandcamp's per-artist subdomains), so a plain "isBeatportUrl" check would
// happily accept a generic /genre/ or /search page — this specifically
// requires the /release/ or /track/ path segment that only a real release
// page has.
function isBpReleasePage(url: string): boolean {
  return /beatport\.com\/(release|track)\//i.test(url);
}

// Beatport.com itself sits behind Cloudflare's bot challenge for any
// non-browser request (confirmed live 2026-08-04 — a plain server-side
// fetch to beatport.com/search or api.beatport.com/v4/... gets a "Just a
// moment..." JS challenge page or a 401 requiring OAuth partner
// credentials, not real content). That rules out BOTH the structured
// autocomplete-hit strategy AND the page-title re-fetch verification that
// bc-search (Bandcamp) relies on — there is no way to independently confirm
// a candidate URL actually is the right release before redirecting.
// The mitigation is a tightly-scoped search query (artist + title,
// restricted to beatport.com's own /release//track/ paths) rather than a
// generic site-wide search — meaningfully more likely to land on the right
// page than today's plain title-only Beatport search, but — unlike
// Bandcamp — this is genuinely NOT verified. Documented here rather than
// silently treated as equivalent confidence to the Bandcamp path.
async function googleSearch(q: string, serperKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ q, num: 10, hl: 'en' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const organic: Array<{ link?: string }> = data?.organic || [];
    for (const r of organic) {
      if (r.link && isBpReleasePage(r.link)) return r.link;
    }
    return null;
  } catch {
    return null;
  }
}

// DuckDuckGo HTML search — zero-cost fallback when Serper's quota/budget is
// the concern, same link-extraction approach as bc-search's own ddgSearch.
async function ddgSearch(q: string): Promise<string | null> {
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const res = await fetch(ddgUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const re = /uddg=([^&"#\s]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      try {
        const decoded = decodeURIComponent(m[1]).split('?')[0].split('#')[0];
        if (isBpReleasePage(decoded)) return decoded;
      } catch { /* bad encoding */ }
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { artist, label, title, release } = await req.json();
    if (!artist?.trim() && !label?.trim()) return respond({ tracks: [], error: 'artist or label required' }, 400);

    const debug: string[] = [];
    const artistName = (artist || '').trim();
    const labelName = (label || '').trim();
    const keyword = (release || title || '').trim();

    const push = (url: string) => [{ url, title: null, artist: null, album: null, released: null, thumb: null }];

    // Also called proactively now (not just on click) to decide whether the
    // Beatport button gets highlighted — see fetchBeatportDirect in
    // waxTreeEngine.jsx, which caches each result for 30 days so a given
    // release is only ever searched once per browser per month.
    const serperKey = Deno.env.get('SERPER_API_KEY') || '';

    // Strategy 1: artist + release/track title, restricted to Beatport's
    // own release/track paths.
    if (artistName && keyword && serperKey) {
      const q = `${artistName} ${keyword} site:beatport.com`;
      const url = await googleSearch(q, serperKey);
      debug.push(`google(artist+kw): ${url || 'null'}`);
      if (url) return respond({ tracks: push(url), debug });
    }

    // Strategy 2: label + title — Beatport lists plenty of releases under
    // a small/independent label's own page rather than surfacing strongly
    // under the artist alone.
    if (labelName && keyword && serperKey) {
      const q = `${labelName} ${keyword} site:beatport.com`;
      const url = await googleSearch(q, serperKey);
      debug.push(`google(label+kw): ${url || 'null'}`);
      if (url) return respond({ tracks: push(url), debug });
    }

    // Strategy 3: DuckDuckGo, zero API cost — same query shape.
    if (keyword) {
      const q = `${artistName || labelName} ${keyword} beatport`;
      const url = await ddgSearch(q);
      debug.push(`ddg: ${url || 'null'}`);
      if (url) return respond({ tracks: push(url), debug });
    }

    debug.push('no match — caller falls back to a plain beatport.com search');
    return respond({ tracks: [], debug });
  } catch (err) {
    return respond({ tracks: [], error: err instanceof Error ? err.message : String(err) });
  }
});

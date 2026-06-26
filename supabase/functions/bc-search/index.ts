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

// Accept any URL with an artist subdomain (artist.bandcamp.com/*).
// These always have a real dot before "bandcamp", unlike bandcamp.com/search which doesn't.
function isBcArtistUrl(url: string) {
  return url.includes('.bandcamp.com');
}

// Bandcamp's own autocomplete — same API used by the search bar on bandcamp.com.
async function bcAutocomplete(query: string): Promise<string | null> {
  try {
    const url = `https://bandcamp.com/api/bcsearch_public_api/1/autocomplete_elastic?q=${encodeURIComponent(query)}&locale=en-US&search_filter=`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json', Referer: 'https://bandcamp.com/' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results: Array<Record<string, string>> = data?.auto?.results || [];
    const hit =
      results.find((r) => (r.type === 'a' || r.type === 't') && r.item_url) ||
      results.find((r) => r.item_url) ||
      results.find((r) => r.url);
    return hit?.item_url || hit?.url || null;
  } catch {
    return null;
  }
}

// Google search via Serper.dev — returns organic result links in order.
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
      if (r.link && isBcArtistUrl(r.link)) return r.link;
    }
    return null;
  } catch {
    return null;
  }
}

// DuckDuckGo HTML search — fallback when autocomplete and Google both fail.
// Uses isBcArtistUrl (any *.bandcamp.com) instead of the old strict /track/ or /album/ check.
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
        if (isBcArtistUrl(decoded)) return decoded;
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
    const { artist, title, release } = await req.json();
    if (!artist?.trim()) return respond({ tracks: [], error: 'artist required' }, 400);

    const debug: string[] = [];
    const artistName = artist.trim();
    const keyword = release?.trim() || title?.trim() || '';
    const serperKey = Deno.env.get('SERPER_API_KEY') || '';

    const push = (url: string) => [{ url, title: null, artist: null, album: null, released: null, thumb: null }];

    // Strategy 1: Bandcamp autocomplete — artist + keyword (most accurate, no API key needed)
    if (keyword) {
      const url = await bcAutocomplete(`${artistName} ${keyword}`);
      debug.push(`bc_auto(artist+kw): ${url || 'null'}`);
      if (url) return respond({ tracks: push(url), debug });
    }

    // Strategy 2: Bandcamp autocomplete — artist only
    const artistUrl = await bcAutocomplete(artistName);
    debug.push(`bc_auto(artist): ${artistUrl || 'null'}`);
    if (artistUrl) return respond({ tracks: push(artistUrl), debug });

    // Strategy 3: Google search via Serper.dev — artist + keyword
    if (keyword && serperKey) {
      const q = `${artistName} ${keyword} site:bandcamp.com`;
      debug.push(`google(artist+kw): ${q}`);
      const url = await googleSearch(q, serperKey);
      if (url) return respond({ tracks: push(url), debug });
    }

    // Strategy 4: Google search via Serper.dev — artist only
    if (serperKey) {
      const q = `${artistName} site:bandcamp.com`;
      debug.push(`google(artist): ${q}`);
      const url = await googleSearch(q, serperKey);
      if (url) return respond({ tracks: push(url), debug });
    }

    // Strategy 5: DuckDuckGo — final fallback (no API key needed).
    // Fixed vs old version: accepts any *.bandcamp.com URL, not just /track/ or /album/.
    const ddgQ = keyword ? `${artistName} ${keyword} bandcamp` : `${artistName} bandcamp`;
    debug.push(`ddg: ${ddgQ}`);
    const ddgUrl = await ddgSearch(ddgQ);
    if (ddgUrl) return respond({ tracks: push(ddgUrl), debug });

    debug.push('not found');
    return respond({ tracks: [], debug });
  } catch (err) {
    return respond({ tracks: [], error: err instanceof Error ? err.message : String(err) });
  }
});

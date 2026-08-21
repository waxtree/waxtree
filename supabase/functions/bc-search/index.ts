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

// Accept any URL with an artist/label subdomain (name.bandcamp.com/*).
// These always have a real dot before "bandcamp", unlike bandcamp.com/search which doesn't.
function isBcArtistUrl(url: string) {
  return url.includes('.bandcamp.com');
}

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface BcHit {
  type: string;
  name: string;
  band_name: string;
  album_name?: string;
  item_url_path: string;
}

// Bandcamp's own search index (same API the search bar on bandcamp.com
// uses) — returns structured {band_name, name, album_name} fields, which
// is what makes real verification possible instead of blindly trusting
// rank order. This was previously called with GET and query-string params;
// the real API is POST with a JSON body (search_text/search_filter/
// full_page/fan_id) — confirmed live 2026-07-30, the old call shape
// returns a MissingParamError every time, meaning this whole strategy was
// silently failing and falling straight through to unverified fallbacks.
async function bcAutocomplete(query: string): Promise<BcHit[]> {
  try {
    const res = await fetch('https://bandcamp.com/api/bcsearch_public_api/1/autocomplete_elastic', {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://bandcamp.com/' },
      body: JSON.stringify({ search_text: query, search_filter: '', full_page: false, fan_id: null }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.auto?.results || []) as BcHit[];
  } catch {
    return [];
  }
}

// A structured hit only counts as a real match if the credited name
// (artist OR label — Bandcamp pages are very often filed under the label,
// not the artist, especially for smaller/underground acts) AND the
// release/track title both correspond to what was actually searched for.
// This is what stops "first autocomplete suggestion" from silently
// standing in for "the right page" — confirmed live: unverified, a query
// with no genuine match can still return SOME plausible-looking result.
function verifyHit(hit: BcHit, wantNames: string[], wantTitle: string): boolean {
  const bandN = norm(hit.band_name);
  const nameOk = wantNames.some((w) => w && (bandN.includes(w) || w.includes(bandN)));
  if (!nameOk) return false;
  if (!wantTitle) return true; // artist/label-only search, no title to check
  // Guard each side against being empty before using it in .includes() —
  // "anything".includes("") is always true in JS, so an album-less hit
  // (the common case: only track-type hits carry album_name) would
  // otherwise pass via the empty albumN side no matter what the real
  // title said. Caught by an offline test before shipping: a hit for a
  // genuinely different release ("A Completely Different EP") verified
  // as a false positive against "Cause & Effect" purely because
  // album_name was undefined.
  const titleN = norm(hit.name);
  const albumN = norm(hit.album_name || '');
  const titleMatch = !!titleN && (titleN.includes(wantTitle) || wantTitle.includes(titleN));
  const albumMatch = !!albumN && (albumN.includes(wantTitle) || wantTitle.includes(albumN));
  return titleMatch || albumMatch;
}

// Bandcamp album/track pages consistently title themselves
// "{Release/Track Title} | {Artist} | {Label}" (confirmed live 2026-07-30
// against real release and track pages) — a single page fetch is enough
// to verify ANY candidate URL against both the credited name and the
// title, regardless of which strategy found it. This is what lets the
// otherwise-unverifiable Google/DuckDuckGo fallbacks still be trusted
// before redirecting, instead of forwarding whatever they happened to
// rank first.
async function verifyPageTitle(url: string, wantNames: string[], wantTitle: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) return false;
    const html = await res.text();
    const m = html.match(/<title>([^<]*)<\/title>/i);
    if (!m) return false;
    const pageTitleN = norm(m[1]);
    const nameOk = wantNames.some((w) => w && pageTitleN.includes(w));
    if (!nameOk) return false;
    return !wantTitle || pageTitleN.includes(wantTitle);
  } catch {
    return false;
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
    const { artist, label, title, release, knownBandUrl } = await req.json();
    if (!artist?.trim() && !label?.trim()) return respond({ tracks: [], error: 'artist or label required' }, 400);

    const debug: string[] = [];
    const artistName = (artist || '').trim();
    const labelName = (label || '').trim();
    const keyword = (release || title || '').trim();
    const artistN = norm(artistName);
    const labelN = norm(labelName);
    const keywordN = norm(keyword);
    const wantNames = [artistN, labelN].filter(Boolean);
    // Discogs' own artist/label "urls" field, when WaxTree has it — see
    // bc-discography's own comment on the same addition. A generic name
    // ("Mosaic") has no way to be disambiguated by name-matching alone;
    // knowing the real domain up front fixes that at its root instead of
    // hoping a stricter text match happens to land right.
    const knownDomain = typeof knownBandUrl === 'string' ? (knownBandUrl.match(/^https?:\/\/([^/]+\.bandcamp\.com)/i)?.[1] || null) : null;
    if (knownDomain && !keyword) {
      debug.push(`knownBandUrl: https://${knownDomain}`);
      return respond({ tracks: [{ url: `https://${knownDomain}`, title: null, artist: null, album: null, released: null, thumb: null }], debug });
    }

    // Enriched with real title/artist/album whenever the match came from a
    // structured bcAutocomplete hit (the common case now that strategy 1/2
    // actually work) — previously always null regardless of match quality,
    // which is why the BANDCAMP section on artist/label pages showed rows
    // with blank titles.
    const push = (url: string, hit?: BcHit) => [{
      url,
      title: hit?.name ?? null,
      artist: hit?.band_name ?? null,
      album: hit?.album_name ?? null,
      released: null,
      thumb: null,
    }];

    // A known domain doesn't just skip name-matching (see the no-keyword
    // shortcut above) — it also gates every remaining strategy below: a
    // candidate is only trusted if it's actually ON that domain, name
    // match or not. Without this, a generic name like "Mosaic" could still
    // pass verifyHit against the wrong "Mosaic" entirely even with the
    // real domain known.
    const onKnownDomain = (path: string) => !knownDomain || path.includes(knownDomain);

    // Strategy 1: Bandcamp's own search, artist + release/track title.
    if (artistName && keyword) {
      const hits = await bcAutocomplete(`${artistName} ${keyword}`);
      const hit = hits.find((h) => verifyHit(h, wantNames, keywordN) && onKnownDomain(h.item_url_path));
      debug.push(`bc(artist+kw): ${hit?.item_url_path || 'no verified match'}`);
      if (hit) return respond({ tracks: push(hit.item_url_path, hit), debug });
    }

    // Strategy 2: label + release/track title — Bandcamp is very often
    // organized by label rather than by artist, especially for
    // underground/independent releases, so this catches real matches
    // strategy 1 alone would miss.
    if (labelName && keyword) {
      const hits = await bcAutocomplete(`${labelName} ${keyword}`);
      const hit = hits.find((h) => verifyHit(h, wantNames, keywordN) && onKnownDomain(h.item_url_path));
      debug.push(`bc(label+kw): ${hit?.item_url_path || 'no verified match'}`);
      if (hit) return respond({ tracks: push(hit.item_url_path, hit), debug });
    }

    // Strategy 3/4: artist/label alone — lands on their own Bandcamp page
    // rather than the specific release, but still a genuinely verified
    // match on the credited name, which beats a generic search page.
    if (artistName) {
      const hits = await bcAutocomplete(artistName);
      const hit = hits.find((h) => verifyHit(h, wantNames, '') && onKnownDomain(h.item_url_path));
      debug.push(`bc(artist): ${hit?.item_url_path || 'no verified match'}`);
      if (hit) return respond({ tracks: push(hit.item_url_path, hit), debug });
    }
    if (labelName) {
      const hits = await bcAutocomplete(labelName);
      const hit = hits.find((h) => verifyHit(h, wantNames, '') && onKnownDomain(h.item_url_path));
      debug.push(`bc(label): ${hit?.item_url_path || 'no verified match'}`);
      if (hit) return respond({ tracks: push(hit.item_url_path, hit), debug });
    }

    // Strategy 5/6: external search engines don't return structured
    // band/title fields, so a candidate URL from here gets ONE extra page
    // fetch to verify its own <title> tag before being trusted — Bandcamp
    // pages consistently title themselves "Title | Artist | Label".
    // Without this, these were the strategies most likely to redirect to
    // an unrelated page: rank order alone is not correspondence.
    const siteScope = knownDomain || 'bandcamp.com';
    const serperKey = Deno.env.get('SERPER_API_KEY') || '';
    if (keyword && serperKey) {
      const q = `${artistName || labelName} ${keyword} site:${siteScope}`;
      const url = await googleSearch(q, serperKey);
      const ok = url ? (onKnownDomain(url) && await verifyPageTitle(url, wantNames, keywordN)) : false;
      debug.push(`google(kw): ${url || 'null'} verified=${ok}`);
      if (url && ok) return respond({ tracks: push(url), debug });
    }
    if (serperKey) {
      const q = `${artistName || labelName} site:${siteScope}`;
      const url = await googleSearch(q, serperKey);
      const ok = url ? (onKnownDomain(url) && await verifyPageTitle(url, wantNames, '')) : false;
      debug.push(`google(name): ${url || 'null'} verified=${ok}`);
      if (url && ok) return respond({ tracks: push(url), debug });
    }
    const ddgQ = keyword ? `${artistName || labelName} ${keyword} bandcamp` : `${artistName || labelName} bandcamp`;
    const ddgUrl = await ddgSearch(ddgQ);
    const ddgOk = ddgUrl ? (onKnownDomain(ddgUrl) && await verifyPageTitle(ddgUrl, wantNames, keywordN)) : false;
    debug.push(`ddg: ${ddgUrl || 'null'} verified=${ddgOk}`);
    if (ddgUrl && ddgOk) return respond({ tracks: push(ddgUrl), debug });

    debug.push('no verified match — caller falls back to a plain bandcamp.com search');
    return respond({ tracks: [], debug });
  } catch (err) {
    return respond({ tracks: [], error: err instanceof Error ? err.message : String(err) });
  }
});

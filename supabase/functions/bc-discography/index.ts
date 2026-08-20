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

interface BcHit {
  type: string;
  name: string;
  band_name: string;
  item_url_path: string;
}

// Same structured search + verification pair as bc-search — duplicated
// rather than shared (this repo has no cross-function shared module; see
// bc-search/bp-search, which already duplicate this same shape) — this is
// ONLY used here to find the artist/label's own Bandcamp page (never a
// specific release), so it's the narrower name-only verifyHit, not the
// title-aware one bc-search also has.
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

function verifyHit(hit: BcHit, wantNames: string[]): boolean {
  const bandN = norm(hit.band_name);
  return wantNames.some((w) => w && (bandN.includes(w) || w.includes(bandN)));
}

function isBcArtistUrl(url: string) {
  return url.includes('.bandcamp.com');
}

// Bandcamp album/track pages consistently title themselves
// "{Release/Track Title} | {Artist} | {Label}" and a band's own /music or
// root page titles itself "{Band Name} | {Band Name}" or similar — a
// single page fetch is enough to verify a candidate URL against the
// wanted name before trusting it. Same approach as bc-search's own
// verifyPageTitle, duplicated for the same reason as bcAutocomplete above.
async function verifyPageTitle(url: string, wantNames: string[]): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) return false;
    const html = await res.text();
    const m = html.match(/<title>([^<]*)<\/title>/i);
    if (!m) return false;
    const pageTitleN = norm(m[1]);
    return wantNames.some((w) => w && pageTitleN.includes(w));
  } catch {
    return false;
  }
}

// Google search via Serper.dev — same fallback bc-search relies on for
// names bcAutocomplete's own search index doesn't surface a hit for
// (confirmed live 2026-08-19: "Malin Genie" resolves via bc-search's
// artist button, which reaches this same fallback tier, but bcAutocomplete
// alone comes back empty for it).
async function googleSearch(q: string, serperKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json', Accept: 'application/json' },
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

async function ddgSearch(q: string): Promise<string | null> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
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

interface DiscographyRelease {
  title: string;
  artist: string | null;
  url: string;
  type: string;
  thumbUrl: string | null;
}

// f4.bcbits.com/img/a{art_id}_{size}.jpg is Bandcamp's own stable art CDN
// pattern — confirmed live 2026-08-19 by cross-referencing an art_id from
// data-client-items against the actual <img> src Bandcamp itself renders
// for that same grid thumbnail (size code 2, ~100px, the size the grid
// itself uses — matches what a small release-card thumbnail needs).
const artUrl = (artId: number | string | null | undefined): string | null => (artId ? `https://f4.bcbits.com/img/a${artId}_2.jpg` : null);

// Bandcamp's /music page only renders the first page (~16-20 items) of
// <li> elements server-side for a big catalog — the rest is hydrated
// client-side from a JSON blob on the grid element itself, data-client-items,
// which (when present) holds the FULL discography including cross-artist
// releases on a label's page (each with its own artist/page_url — this is
// what makes the label case work correctly for various-artist releases).
// Confirmed live 2026-08-19 against hyperdub.bandcamp.com (205 releases in
// data-client-items vs only 16 rendered <li> elements) and a small solo
// artist page with NO data-client-items attribute at all (catalog small
// enough that the initial render already has everything) — both paths are
// handled below, the second is not a fallback for failure, it's the normal
// case for anyone with a modest catalog.
function parseClientItems(html: string, bandUrl: string): DiscographyRelease[] | null {
  const m = html.match(/data-client-items="([^"]*)"\s/);
  if (!m) return null;
  try {
    const raw = m[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    const items = JSON.parse(raw) as Array<{ title?: string; artist?: string; page_url?: string; type?: string; art_id?: number }>;
    return items
      .filter((item) => item.title && item.page_url)
      .map((item) => {
        const url = item.page_url as string;
        // A label's page carries absolute cross-artist URLs here (confirmed
        // on hyperdub.bandcamp.com — burial.bandcamp.com/album/..., not a
        // path); an artist's OWN page instead carries bare paths for its own
        // releases (confirmed live on malingenie.bandcamp.com — "/album/..."
        // with no host at all). Both need handling, not just the first one
        // this was tested against.
        const absoluteUrl = url.startsWith('http') ? url : bandUrl.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url);
        return { title: item.title as string, artist: item.artist || null, url: absoluteUrl, type: item.type || 'album', thumbUrl: artUrl(item.art_id) };
      });
  } catch {
    return null;
  }
}

function parseVisibleGrid(html: string, bandUrl: string): DiscographyRelease[] {
  const gridMatch = html.match(/<ol id="music-grid".*?<\/ol>/s);
  if (!gridMatch) return [];
  const items = gridMatch[0].match(/<li[^>]*data-item-id="[^"]*"[\s\S]*?<\/li>/g) || [];
  const out: DiscographyRelease[] = [];
  for (const item of items) {
    const typeMatch = item.match(/data-item-id="(album|track)-/);
    const hrefMatch = item.match(/<a href="([^"]+)"/);
    const titleMatch = item.match(/<p class="title">\s*([^<]+?)\s*(?:<|$)/s);
    if (!hrefMatch || !titleMatch) continue;
    const href = hrefMatch[1].startsWith('http') ? hrefMatch[1] : bandUrl.replace(/\/$/, '') + hrefMatch[1];
    const imgMatch = item.match(/<img src="([^"]+)"/);
    out.push({ title: titleMatch[1].trim(), artist: null, url: href, type: typeMatch?.[1] || 'album', thumbUrl: imgMatch?.[1] || null });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { artist, label, knownBandUrl } = await req.json();
    const artistName = (artist || '').trim();
    const labelName = (label || '').trim();
    if (!artistName && !labelName) return respond({ resolved: false, releases: [], error: 'artist or label required' }, 400);

    const debug: string[] = [];
    const wantNames = [norm(artistName), norm(labelName)].filter(Boolean);

    // A caller-supplied, already-verified band URL (WaxTree passes Discogs'
    // own artist/label "urls" field when it has one) skips name-guessing
    // entirely — genuinely authoritative, unlike bcAutocomplete/Google/DDG
    // below, which have no way to disambiguate two unrelated acts sharing
    // a generic name. Confirmed live 2026-08-21: the label "Mosaic"
    // resolved to an entirely different "Mosaic" on Bandcamp via name
    // search — Discogs' own urls field already had the real one.
    let bandUrlPath: string | null = typeof knownBandUrl === 'string' && /^https?:\/\/[^/]+\.bandcamp\.com/i.test(knownBandUrl) ? knownBandUrl : null;
    if (bandUrlPath) debug.push(`knownBandUrl: ${bandUrlPath}`);
    if (!bandUrlPath && artistName) {
      const hits = await bcAutocomplete(artistName);
      const hit = hits.find((h) => verifyHit(h, wantNames));
      debug.push(`bc(artist): ${hit?.item_url_path || 'no verified match'}`);
      if (hit) bandUrlPath = hit.item_url_path;
    }
    if (!bandUrlPath && labelName) {
      const hits = await bcAutocomplete(labelName);
      const hit = hits.find((h) => verifyHit(h, wantNames));
      debug.push(`bc(label): ${hit?.item_url_path || 'no verified match'}`);
      if (hit) bandUrlPath = hit.item_url_path;
    }
    // bcAutocomplete's own search index doesn't have a hit for every real
    // Bandcamp presence (confirmed live: "Malin Genie" is one) — same
    // Google/DDG fallback tier bc-search relies on for exactly this case,
    // reused here for the artist/label's OWN page rather than a specific
    // release.
    const serperKey = Deno.env.get('SERPER_API_KEY') || '';
    if (!bandUrlPath && serperKey) {
      const q = `${artistName || labelName} site:bandcamp.com`;
      const url = await googleSearch(q, serperKey);
      const ok = url ? await verifyPageTitle(url, wantNames) : false;
      debug.push(`google(name): ${url || 'null'} verified=${ok}`);
      if (url && ok) bandUrlPath = url;
    }
    if (!bandUrlPath) {
      const url = await ddgSearch(`${artistName || labelName} bandcamp`);
      const ok = url ? await verifyPageTitle(url, wantNames) : false;
      debug.push(`ddg: ${url || 'null'} verified=${ok}`);
      if (url && ok) bandUrlPath = url;
    }
    if (!bandUrlPath) {
      debug.push('no verified band page — cannot check discography');
      return respond({ resolved: false, releases: [], debug });
    }

    // item_url_path from autocomplete can point straight at a release
    // (an artist whose Bandcamp presence is a single album, no /music page
    // of their own) — normalize down to the band root before appending
    // /music.
    const bandUrl = bandUrlPath.replace(/^(https?:\/\/[^/]+\.bandcamp\.com).*/i, '$1');

    const res = await fetch(bandUrl + '/music', { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) {
      debug.push(`music page fetch failed: ${res.status}`);
      return respond({ resolved: true, bandUrl, releases: [], debug });
    }
    const html = await res.text();

    let releases = parseClientItems(html, bandUrl);
    debug.push(releases ? `data-client-items: ${releases.length} releases` : 'no data-client-items, falling back to visible grid');
    if (!releases) releases = parseVisibleGrid(html, bandUrl);

    // Dedup by URL — a compilation the label re-lists under its own page
    // AND under the featured artist's page (as seen live on hyperdub) can
    // otherwise appear twice when a caller merges label + artist checks.
    const seen = new Set<string>();
    releases = releases.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));

    // Safety ceiling, not a real-world expectation — even a very prolific
    // label/artist tops out well under this on Bandcamp.
    if (releases.length > 1000) releases = releases.slice(0, 1000);

    return respond({ resolved: true, bandUrl, releases, debug });
  } catch (err) {
    return respond({ resolved: false, releases: [], error: err instanceof Error ? err.message : String(err) });
  }
});

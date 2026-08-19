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

interface DiscographyRelease {
  title: string;
  artist: string | null;
  url: string;
  type: string;
}

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
function parseClientItems(html: string): DiscographyRelease[] | null {
  const m = html.match(/data-client-items="([^"]*)"\s/);
  if (!m) return null;
  try {
    const raw = m[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    const items = JSON.parse(raw) as Array<{ title?: string; artist?: string; page_url?: string; type?: string }>;
    return items
      .filter((item) => item.title && item.page_url)
      .map((item) => ({ title: item.title as string, artist: item.artist || null, url: item.page_url as string, type: item.type || 'album' }));
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
    out.push({ title: titleMatch[1].trim(), artist: null, url: href, type: typeMatch?.[1] || 'album' });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { artist, label } = await req.json();
    const artistName = (artist || '').trim();
    const labelName = (label || '').trim();
    if (!artistName && !labelName) return respond({ resolved: false, releases: [], error: 'artist or label required' }, 400);

    const debug: string[] = [];
    const wantNames = [norm(artistName), norm(labelName)].filter(Boolean);

    let bandUrlPath: string | null = null;
    if (artistName) {
      const hits = await bcAutocomplete(artistName);
      const hit = hits.find((h) => verifyHit(h, wantNames));
      if (hit) bandUrlPath = hit.item_url_path;
    }
    if (!bandUrlPath && labelName) {
      const hits = await bcAutocomplete(labelName);
      const hit = hits.find((h) => verifyHit(h, wantNames));
      if (hit) bandUrlPath = hit.item_url_path;
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

    let releases = parseClientItems(html);
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

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
    const { knownBandUrl } = await req.json();

    // Deliberately requires a caller-verified band URL — WaxTree passes
    // Discogs' own artist/label "urls" field, when it has one. Used to
    // fall back to name-guessing (Bandcamp's own search, then Google/DDG)
    // when that was missing, but confirmed live 2026-08-21: for a generic
    // name ("Mosaic"), that fallback confidently resolved to a completely
    // unrelated act's Bandcamp page — verified only against a page title
    // containing the search string, which has no way to tell two
    // different things sharing a name apart. This is a cross-check that
    // asserts "not on Discogs" about what it finds; a wrong profile isn't
    // a worse answer, it's actively misleading. Better to report
    // unresolved (the caller shows nothing) for the — probably common —
    // case where Discogs doesn't have the link on file, than to guess
    // confidently wrong.
    const bandUrlPath: string | null = typeof knownBandUrl === 'string' && /^https?:\/\/[^/]+\.bandcamp\.com/i.test(knownBandUrl) ? knownBandUrl : null;
    if (!bandUrlPath) {
      return respond({ resolved: false, releases: [], debug: ['no knownBandUrl — Discogs has no Bandcamp link on file for this name, so nothing verified to check'] });
    }

    // item_url_path can point straight at a release (an artist whose
    // Bandcamp presence is a single album, no /music page of their own) —
    // normalize down to the band root before appending /music.
    const bandUrl = bandUrlPath.replace(/^(https?:\/\/[^/]+\.bandcamp\.com).*/i, '$1');

    const debug: string[] = [`knownBandUrl: ${bandUrl}`];
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

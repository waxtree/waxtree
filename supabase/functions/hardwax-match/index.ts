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

interface HardwaxResult {
  id: string;
  url: string;
  artist: string;
  actUrl: string | null;
  title: string;
  label: string | null;
  comment: string | null;
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

// Artist names inside a comment sometimes get individually bolded
// (<b>Larry</b> <b>Heard</b>&#39;s...) — decode entities BEFORE stripping
// tags, not after: the apostrophe is still "&#39;" (no literal space of its
// own) when the tag-strip runs, so a tags-first order leaves "Heard 's"
// instead of "Heard's". Confirmed live 2026-08-27.
const stripTags = (s: string): string => decodeEntities(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\s+'/g, "'").trim();

// Both hard Wax's search results page (?search=<query>) AND an artist's
// own full-discography page (/act/<slug>/) render the SAME per-release
// structure — one <article class="co cq pw">, carrying: the artist's own
// page link (title attr = plain artist name, href = /act/<slug>/), the
// release title (span.rp), the label's own page link
// (a title="Label Name" href="/label/..."), and — what this function
// actually exists for — their own short editorial blurb in <p class="qt">,
// e.g. "Minimal, stripped back techno". Confirmed live 2026-08-27 against
// both page types. This function deliberately does NOT decide which
// result (if any) is the right match — it returns every candidate the
// page rendered, raw, and lets the caller apply the same
// normalizeStr/bcOnlyMatches fuzzy-match confirmation already used for the
// Bandcamp-only cross-check, rather than duplicating that judgment call
// server-side (see fetchHardwaxComment in waxTreeEngine.jsx). Confidence —
// not scraping ability — was the actual lesson from the "Mosaic" Bandcamp
// mismatch; this keeps that judgment call in one place.
// The third class on a release's <article> varies — "co cq pw" and
// "co cq px" both seen live 2026-08-27 on the SAME act page (Underground
// Resistance), with otherwise IDENTICAL structure and both carrying a
// perfectly real <p class="qt"> comment — matching "pw" only silently
// dropped every "px" release, "World 2 World" among them (the actual
// release this fallback was built to catch). Not worth pinning down
// exactly what the two variants mean (format? stock state? something
// else) when both are equally valid data — [wx] just accepts either.
const parseResults = (html: string): HardwaxResult[] => {
  const blocks = html.match(/<article class="co cq p[wx]">[\s\S]*?<\/article>/g) || [];
  const out: HardwaxResult[] = [];
  for (const block of blocks) {
    const idMatch = block.match(/id="record-(\d+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const artistMatch = block.match(/<a class="rn" title="([^"]+)"\s+href="([^"]+)"/);
    const titleMatch = block.match(/<span class="rp">([^<]+)<\/span>/);
    if (!artistMatch || !titleMatch) continue;
    const labelMatch = block.match(/<a[^>]*title="([^"]+)"\s+href="\/label\/[^"]+"/);
    const commentMatch = block.match(/<p class="qt">([\s\S]*?)<\/p>/);
    // The canonical release path — /{id}/{artist-slug}/{title-slug}/ —
    // appears as the href on the (label, catalog-no) link near the top of
    // the block; falling back to the record id alone still gives a valid
    // (if less pretty) URL.
    const hrefMatch = block.match(new RegExp(`href="(/${id}/[^"]+)"`));
    out.push({
      id,
      url: 'https://hardwax.com' + (hrefMatch ? hrefMatch[1] : `/${id}/`),
      artist: stripTags(artistMatch[1]),
      actUrl: artistMatch[2].startsWith('/act/') ? 'https://hardwax.com' + artistMatch[2] : null,
      title: decodeEntities(titleMatch[1]),
      label: labelMatch ? decodeEntities(labelMatch[1]) : null,
      comment: commentMatch ? stripTags(commentMatch[1]) : null,
    });
    if (out.length >= 30) break; // an artist's own discography page can run long — the site search's own top results are capped tighter, see the 10-result slice below
  }
  return out;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { query, actUrl } = await req.json();
    let url: string;
    // actUrl lets the caller fetch one specific artist's full discography
    // directly, once it already has a confirmed link to it from a prior
    // search result — used as a fallback when the generic site search
    // doesn't surface the right release near the top of its own ranking.
    // Confirmed live 2026-08-27: hardwax.com/?search=Basic+Channel+Radiance
    // (a real, correctly-catalogued release) surfaces only an unrelated
    // compilation on a fresh session — but /act/basic-channel/ lists every
    // Basic Channel release, comment included, on one page. Restricted to
    // hardwax.com's own /act/ path so this can't be turned into an
    // open proxy for arbitrary URLs.
    if (typeof actUrl === 'string' && /^https:\/\/hardwax\.com\/act\/[^/?#]+\/?$/.test(actUrl)) {
      url = actUrl;
    } else if (typeof query === 'string' && query.trim()) {
      url = 'https://hardwax.com/?search=' + encodeURIComponent(query.trim());
    } else {
      return respond({ results: [] });
    }

    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) return respond({ results: [], debug: `fetch failed: ${res.status}` });

    const html = await res.text();
    let results = parseResults(html);
    if (!actUrl) results = results.slice(0, 10); // a generic search's own top hits are what matter; an act page is already one artist, worth scanning further
    return respond({ results });
  } catch (err) {
    return respond({ results: [], error: err instanceof Error ? err.message : String(err) });
  }
});

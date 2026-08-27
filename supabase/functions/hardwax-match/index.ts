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

// Hard Wax's search results page (?search=<query>) renders one <article
// class="co cq pw"> per release, each carrying: the artist's own page link
// (title attr = plain artist name), the release title (span.rp), the
// label's own page link (a title="Label Name" href="/label/..."), and —
// what this function actually exists for — their own short editorial
// blurb in <p class="qt">, e.g. "Minimal, stripped back techno". Confirmed
// live 2026-08-27 against hardwax.com/?search=Larry+Heard. This function
// deliberately does NOT decide which result (if any) is the right match —
// it returns every candidate the search page rendered, raw, and lets the
// caller apply the same normalizeStr/bcOnlyMatches fuzzy-match confirmation
// already used for the Bandcamp-only cross-check, rather than duplicating
// that matching logic server-side (see fetchHardwaxComment in
// waxTreeEngine.jsx). Confidence — not scraping ability — was the actual
// lesson from the "Mosaic" Bandcamp mismatch; this keeps that judgment call
// in one place.
const parseResults = (html: string): HardwaxResult[] => {
  const blocks = html.match(/<article class="co cq pw">[\s\S]*?<\/article>/g) || [];
  const out: HardwaxResult[] = [];
  for (const block of blocks) {
    const idMatch = block.match(/id="record-(\d+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const artistMatch = block.match(/<a class="rn" title="([^"]+)"/);
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
      title: decodeEntities(titleMatch[1]),
      label: labelMatch ? decodeEntities(labelMatch[1]) : null,
      comment: commentMatch ? stripTags(commentMatch[1]) : null,
    });
    if (out.length >= 10) break; // the search page's own top results are always the most relevant — no need to parse the whole page
  }
  return out;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { query } = await req.json();
    if (typeof query !== 'string' || !query.trim()) return respond({ results: [] });

    const url = 'https://hardwax.com/?search=' + encodeURIComponent(query.trim());
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) return respond({ results: [], debug: `search fetch failed: ${res.status}` });

    const html = await res.text();
    const results = parseResults(html);
    return respond({ results });
  } catch (err) {
    return respond({ results: [], error: err instanceof Error ? err.message : String(err) });
  }
});

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

const secondsToDuration = (sec: number): string | null => {
  if (!sec || sec <= 0) return null;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

interface TrackinfoItem {
  title?: string;
  track_num?: number;
  duration?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string' || !url.includes('.bandcamp.com')) {
      return respond({ tracks: [], error: 'valid bandcamp url required' }, 400);
    }

    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) return respond({ tracks: [], error: `page fetch failed: ${res.status}` });
    const html = await res.text();

    // Every Bandcamp album/track page embeds its own tracklist as an
    // HTML-escaped JSON blob in the data-tralbum attribute (confirmed live
    // 2026-08-20 against a real 17-track album page) — title, track_num,
    // and duration (seconds, float) per track, everything needed to render
    // real per-track rows instead of the release-title-as-one-row
    // placeholder this replaces.
    const m = html.match(/data-tralbum="([^"]*)"\s/);
    if (!m) return respond({ tracks: [], error: 'no tralbum data on page' });
    const raw = m[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    const data = JSON.parse(raw) as { trackinfo?: TrackinfoItem[] };
    const trackinfo = data.trackinfo || [];
    const tracks = trackinfo
      .filter((t) => t.title)
      .sort((a, b) => (a.track_num || 0) - (b.track_num || 0))
      .map((t) => ({ title: t.title as string, duration: secondsToDuration(t.duration || 0) }));

    return respond({ tracks });
  } catch (err) {
    return respond({ tracks: [], error: err instanceof Error ? err.message : String(err) });
  }
});

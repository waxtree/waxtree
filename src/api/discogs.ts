import type { ArtistData, DiscogsSearchResult, Release, Track } from '../types';

const BASE = 'https://api.discogs.com';
const TOKEN = import.meta.env.VITE_DISCOGS_TOKEN as string;

let reqCount = 0;
let windowStart = Date.now();

async function req<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const now = Date.now();
  if (now - windowStart > 60_000) { reqCount = 0; windowStart = now; }
  if (reqCount >= 55) {
    await new Promise(r => setTimeout(r, 60_000 - (Date.now() - windowStart) + 500));
    reqCount = 0; windowStart = Date.now();
  }
  reqCount++;

  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Discogs token=${TOKEN}`,
      'User-Agent': 'CrateTree/1.0 +https://github.com/cratetree',
    },
  });
  if (res.status === 429) throw new Error('Rate limit raggiunto — riprova tra qualche secondo');
  if (!res.ok) throw new Error(`Discogs API ${res.status}`);
  return res.json() as Promise<T>;
}

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`ct:${key}`);
    if (!raw) return null;
    const { d, t } = JSON.parse(raw) as { d: T; t: number };
    if (Date.now() - t < 86_400_000) return d;
    localStorage.removeItem(`ct:${key}`);
  } catch { /* ignore */ }
  return null;
}
function lsSet(key: string, data: unknown) {
  try { localStorage.setItem(`ct:${key}`, JSON.stringify({ d: data, t: Date.now() })); }
  catch { /* quota exceeded — ignore */ }
}

// Strip Discogs BBCode markup from bio text
function stripMarkup(text: string): string {
  return text
    .replace(/\[a\d*=([^\]]+)\]/g, '$1')
    .replace(/\[l=([^\]]+)\]/g, '$1')
    .replace(/\[r=([^\]]+)\]/g, '$1')
    .replace(/\[url=[^\]]*\]([^\[]*)\[\/url\]/g, '$1')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\r\n|\r/g, '\n')
    .trim();
}

interface DSearchResp {
  results: Array<{ id: number; type: string; title: string; thumb?: string; uri?: string }>;
}
export async function searchArtists(query: string): Promise<DiscogsSearchResult[]> {
  const cached = lsGet<DiscogsSearchResult[]>(`search:${query}`);
  if (cached) return cached;
  const data = await req<DSearchResp>('/database/search', {
    q: query, type: 'artist', per_page: '20',
  });
  const results = data.results.map(r => ({ id: r.id, type: r.type, title: r.title, thumb: r.thumb, uri: r.uri }));
  lsSet(`search:${query}`, results);
  return results;
}

interface DArtistResp {
  id: number; name: string; profile?: string; realname?: string;
  images?: Array<{ type: string; uri: string; uri150: string }>;
  aliases?: Array<{ id: number; name: string }>;
  namevariations?: string[];
  urls?: string[];
}
interface DReleasesResp {
  releases: Array<{
    id: number; title: string; year?: number; thumb?: string;
    label?: string; labels?: Array<{ name: string; id: number; catno: string }>;
    format?: string; role?: string; type?: string; resource_url: string;
  }>;
  pagination: { items: number; page: number; pages: number };
}

export async function fetchArtist(id: number): Promise<ArtistData> {
  const cached = lsGet<ArtistData>(`artist:${id}`);
  if (cached) return cached;

  const [artistResp, relResp] = await Promise.all([
    req<DArtistResp>(`/artists/${id}`),
    req<DReleasesResp>(`/artists/${id}/releases`, { per_page: '50', sort: 'year', sort_order: 'desc', page: '1' }),
  ]);

  const primaryImage = artistResp.images?.find(i => i.type === 'primary') ?? artistResp.images?.[0];

  const releases: Release[] = relResp.releases
    .filter(r => r.role === 'Main' || r.role === 'Appearance')
    .map(r => {
      const labelName = r.labels?.[0]?.name ?? r.label;
      const labelId = r.labels?.[0]?.id;
      const catno = r.labels?.[0]?.catno;
      return {
        id: r.id,
        title: r.title,
        year: r.year,
        format: r.format,
        label: labelName,
        labelId,
        catno,
        thumb: r.thumb,
        discogsUrl: `https://www.discogs.com/release/${r.id}`,
        resourceUrl: r.resource_url,
        tracksLoaded: false,
        expanded: false,
      };
    });

  const data: ArtistData = {
    id: artistResp.id,
    name: artistResp.name,
    bio: artistResp.profile ? stripMarkup(artistResp.profile) : undefined,
    imageUrl: primaryImage?.uri,
    aliases: artistResp.aliases,
    namevariations: artistResp.namevariations,
    realname: artistResp.realname,
    urls: artistResp.urls,
    releases,
    releasesLoaded: true,
    releasesPage: 1,
    releasesTotal: relResp.pagination.items,
  };

  lsSet(`artist:${id}`, data);
  return data;
}

interface DReleaseResp {
  tracklist: Array<{ position?: string; title: string; duration?: string; type_?: string }>;
}
export async function fetchReleaseTracks(releaseId: number): Promise<Track[]> {
  const cached = lsGet<Track[]>(`tracks:${releaseId}`);
  if (cached) return cached;
  const data = await req<DReleaseResp>(`/releases/${releaseId}`);
  const tracks = data.tracklist
    .filter(t => t.type_ !== 'heading')
    .map((t, i) => ({
      id: `${releaseId}-${t.position ?? i}`,
      releaseId,
      position: t.position,
      title: t.title,
      duration: t.duration,
    }));
  lsSet(`tracks:${releaseId}`, tracks);
  return tracks;
}

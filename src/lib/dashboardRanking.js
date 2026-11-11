// Turns a raw pool of Discogs search hits into the handful of records one
// dashboard string shows. Discogs can't sort by popularity, so the pool is a
// sample (one or two pages of 100) and everything below is ranking that sample.
const BAD_FORMATS = new Set(['CD', 'CDr', 'DVD', 'Blu-ray', 'Box Set', 'VHS', 'Minidisc', 'Memory Stick']);
const SKIP_NEIGHBOUR_LABEL_RE = /^(not on label|self-released|white label|no label|unknown)/i;
// Below this many owners+wanters a record is more likely a blank/test pressing
// than a hidden gem.
const MIN_FOOTPRINT = 3;
const LOW_HAVE = 5;

const norm = text => (text || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\(\d+\)/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Discogs titles are "Artist - Release"; a name can carry a "(2)" suffix that
// only disambiguates two acts and means nothing to a listener.
export const splitTitle = title => {
  const index = (title || '').indexOf(' - ');
  if (index < 0) return { artist: '', name: title || '' };
  return { artist: title.slice(0, index).replace(/\s*\(\d+\)$/, ''), name: title.slice(index + 3) };
};

// The label an artist pick releases on most (skipping "Not On Label" and co.).
export const homeLabel = probe => Object.entries(probe?.labels || {})
  .filter(([name]) => !SKIP_NEIGHBOUR_LABEL_RE.test(name))
  .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

// What counts as "obvious" for someone's picks: the picks themselves, the
// labels they mostly release on, (for a label pick) its roster, and
// `nearbyArtists` — the picks' Discogs circles and their home labels' rosters.
export const buildNeighbourhood = ({ favoriteArtists, favoriteLabels, probes, nearbyArtists = [] }) => {
  const artists = new Set();
  const labels = new Set();
  const top = (counts, limit) => Object.entries(counts || {})
    .filter(([name, count]) => count >= 2 && !SKIP_NEIGHBOUR_LABEL_RE.test(name))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => norm(name));
  favoriteArtists.forEach(fav => {
    artists.add(norm(fav.name));
    top(probes[`artist:${fav.discogsId}`]?.labels, 4).forEach(name => labels.add(name));
  });
  favoriteLabels.forEach(fav => {
    labels.add(norm(fav.name));
    top(probes[`label:${fav.discogsId}`]?.artists, 12).forEach(name => artists.add(name));
  });
  nearbyArtists.forEach(name => artists.add(norm(name)));
  artists.delete('');
  labels.delete('');
  return { artists, labels };
};

const isNeighbour = (item, neighbourhood) => {
  if (neighbourhood.artists.has(norm(splitTitle(item.title).artist))) return true;
  return (item.labels || []).some(label => neighbourhood.labels.has(norm(label)));
};

// Rank of each value inside the sample, 0 (lowest) … 1 (highest).
const percentiles = (items, valueOf) => {
  const order = items.map((item, index) => [valueOf(item), index]).sort((a, b) => a[0] - b[0]);
  const out = new Array(items.length).fill(0.5);
  if (items.length > 1) order.forEach(([, index], rank) => { out[index] = rank / (items.length - 1); });
  return out;
};

const scoreItems = (items, mode, depth, rand) => {
  const have = percentiles(items, item => item.have);
  const footprint = percentiles(items, item => item.have + item.want);
  // Wanted far more than owned = scarce and in demand: the hidden-gem signal.
  const gem = percentiles(items, item => item.want / (item.have + LOW_HAVE));
  const recent = percentiles(items, item => item.year || 0);
  return items.map((item, index) => {
    const deep = 0.6 * (1 - have[index]) + 0.4 * gem[index];
    const essential = footprint[index];
    let score;
    if (mode === 'fresh') score = 0.5 * recent[index] + 0.5 * essential;
    else if (mode === 'essentials') score = 0.85 * essential + 0.15 * deep;
    else score = depth * deep + (1 - depth) * essential;
    if (mode !== 'fresh' && item.have < LOW_HAVE) score *= 0.5;
    if (item.thumb) score += 0.08;
    if (item.format === 'Vinyl' || item.format === 'File') score += 0.04;
    return score + rand() * 0.25;
  });
};

const yearBucket = year => (year ? Math.floor(year / 5) : 0);

// Greedy pick with a penalty for repeating a label, an artist or (when the
// string spans many years) the same five-year stretch, so a string reads as a
// browse and not as one label's catalogue.
const pickDiverse = (entries, count, spreadYears) => {
  const labelCount = new Map();
  const artistCount = new Map();
  const bucketCount = new Map();
  const left = [...entries];
  const out = [];
  while (out.length < count && left.length) {
    let bestIndex = 0;
    let bestNet = -Infinity;
    left.forEach((entry, index) => {
      const net = entry.score
        - 0.35 * (labelCount.get(entry.labelKey) || 0)
        - 0.5 * (artistCount.get(entry.artistKey) || 0)
        - (spreadYears ? 0.12 * (bucketCount.get(entry.bucket) || 0) : 0);
      if (net > bestNet) { bestNet = net; bestIndex = index; }
    });
    const [chosen] = left.splice(bestIndex, 1);
    out.push(chosen);
    if (chosen.labelKey) labelCount.set(chosen.labelKey, (labelCount.get(chosen.labelKey) || 0) + 1);
    if (chosen.artistKey) artistCount.set(chosen.artistKey, (artistCount.get(chosen.artistKey) || 0) + 1);
    bucketCount.set(chosen.bucket, (bucketCount.get(chosen.bucket) || 0) + 1);
  }
  return out;
};

export const createUsedSet = () => ({ ids: new Set(), masters: new Set() });

// context: { mode, depth, excludeNeighbours, neighbourhood, owned:{ids,masters},
// listened:Set, used, rand, count, spreadYears }. `used` is shared by every
// string so one record never shows twice on the page.
export const pickForRow = (pool, context) => {
  const { mode, depth, excludeNeighbours, neighbourhood, owned, listened, used, rand, count, spreadYears } = context;
  const seenInPool = new Set();
  const candidates = pool.filter(item => {
    if (!item?.id || !item.title || seenInPool.has(item.id)) return false;
    seenInPool.add(item.id);
    if (/^various/i.test(item.title) || BAD_FORMATS.has(item.format)) return false;
    if (used.ids.has(item.id) || (item.master && used.masters.has(item.master))) return false;
    if (owned.ids.has(item.id) || (item.master && owned.masters.has(item.master)) || listened.has(`gy-${item.id}`)) return false;
    if (mode !== 'fresh' && item.have + item.want < MIN_FOOTPRINT) return false;
    if (excludeNeighbours && mode === 'depth' && isNeighbour(item, neighbourhood)) return false;
    return true;
  });
  const scores = scoreItems(candidates, mode, depth, rand);
  const entries = candidates.map((item, index) => ({
    item,
    score: scores[index],
    labelKey: norm(item.label),
    artistKey: norm(splitTitle(item.title).artist),
    bucket: yearBucket(item.year),
  }));
  const picked = pickDiverse(entries, count, spreadYears).map(entry => entry.item);
  picked.forEach(item => {
    used.ids.add(item.id);
    if (item.master) used.masters.add(item.master);
  });
  return picked.map(item => {
    const { artist, name } = splitTitle(item.title);
    return { id: item.id, artist, name, thumb: item.thumb, year: item.year, label: item.label, format: item.format };
  });
};

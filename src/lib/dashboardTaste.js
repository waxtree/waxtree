import { peakWindow } from './dashboardRecipes';

// What the person's likes say about their taste: which styles, which years,
// and which style + years they have been liking lately. Recent likes weigh
// more — "lots of 2024 techno liked recently" should steer the techno strings.
const RECENT_MS = 45 * 24 * 60 * 60 * 1000;
// Likes saved before likedAt existed have no date; the latest quarter of
// them (likedTracks keeps the order they were added in) counts as recent.
const RECENT_SHARE = 0.25;
const RECENT_WEIGHT = 3;
const MIN_CLUSTER_WEIGHT = 3;
// Umbrella styles Discogs puts on almost everything; when one ties with a
// narrower style over the same likes, the narrower one makes the better string.
const BROAD_STYLES = new Set(['Techno', 'House', 'Electro', 'Ambient', 'Downtempo', 'Breakbeat', 'Trance', 'Disco', 'Experimental']);

const splitStyles = genre => (genre || '').split(' · ').map(style => style.trim()).filter(Boolean);

const add = (map, key, amount) => { map[key] = (map[key] || 0) + amount; };

export const tasteFromLikes = (likedTracks, now = Date.now()) => {
  const likes = Object.values(likedTracks || {}).filter(track => track && (track.genre || track.year));
  const styleWeight = {};
  const yearWeight = {};
  const styleYears = {};
  const recentStyleYears = {};
  likes.forEach((track, index) => {
    const recent = track.likedAt ? now - track.likedAt < RECENT_MS : index >= likes.length * (1 - RECENT_SHARE);
    const weight = recent ? RECENT_WEIGHT : 1;
    const year = parseInt(track.year, 10) || null;
    const styles = splitStyles(track.genre);
    styles.forEach(style => add(styleWeight, style, weight / styles.length));
    if (!year) return;
    add(yearWeight, year, weight);
    styles.forEach(style => {
      styleYears[style] ||= {};
      add(styleYears[style], year, weight);
      if (!recent) return;
      recentStyleYears[style] ||= {};
      add(recentStyleYears[style], year, weight);
    });
  });
  // The strongest style + year windows, e.g. Techno 2023–24. A style's recent
  // window wins over its all-time one when it holds enough likes by itself.
  const clusters = Object.keys(styleYears).map(style => {
    const recentWindow = recentStyleYears[style] && peakWindow(recentStyleYears[style]);
    const recent = recentWindow && recentWindow.held >= MIN_CLUSTER_WEIGHT * RECENT_WEIGHT;
    const window = recent ? recentWindow : peakWindow(styleYears[style]);
    return window && { style, window, recent: !!recent, weight: window.held };
  }).filter(cluster => cluster && cluster.weight >= MIN_CLUSTER_WEIGHT)
    .sort((a, b) => b.weight - a.weight || BROAD_STYLES.has(a.style) - BROAD_STYLES.has(b.style));
  // Likes tagged "Techno · Dub Techno" make two clusters over the same years;
  // one string per window is enough.
  const seenWindows = new Set();
  const distinct = clusters.filter(({ window }) => {
    const key = `${window.from}-${window.to}`;
    return !seenWindows.has(key) && seenWindows.add(key);
  });
  return { count: likes.length, styleWeight, yearWeight, clusters: distinct };
};

// Year weights from likes and the favourites' release histograms together —
// what the decade strings lean on when choosing which years to dig.
export const mergeYearWeights = (likesYears, signals) => {
  const merged = { ...likesYears };
  Object.values(signals || {}).forEach(signal => {
    const total = Object.values(signal.years || {}).reduce((sum, count) => sum + count, 0);
    if (!total) return;
    Object.entries(signal.years).forEach(([year, count]) => add(merged, year, (count / total) * 4));
  });
  return merged;
};

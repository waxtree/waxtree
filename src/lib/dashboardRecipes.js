import { STYLE_FAMILIES } from './styleFamilies';
import { shuffled } from './dashboardRandom';
import { homeLabel } from './dashboardRanking';

// A recipe is one dashboard string, described only by what to ask Discogs for.
// Nothing here touches the network or the UI — `queries` are plain search
// params the engine runs later. `mode` tells the ranker what "good" means for
// that string: 'depth' follows the person's dig profile, 'essentials' wants the
// well-known records, 'fresh' wants the newest ones.
const DECADES = [1990, 2000, 2010, 2020];
// A favourite only counts as having an "era" when a short window holds a real
// share of its catalogue; otherwise its releases are spread too thin to say.
const MIN_ERA_SHARE = 0.3;
const MIN_ERA_RELEASES = 3;
const ERA_SPAN = 2;
const SINGLE_GENRE_ROWS = 7;

// The best `span`-year window of a year histogram, e.g. {2007: 9, 2008: 7,
// 2015: 1} → 2007–2008 holding 94% of the releases.
export const peakWindow = (years, span = ERA_SPAN) => {
  const counted = Object.entries(years || {})
    .map(([year, count]) => [Number(year), count])
    .filter(([year, count]) => year >= 1975 && count > 0);
  if (!counted.length) return null;
  const total = counted.reduce((sum, [, count]) => sum + count, 0);
  const byYear = new Map(counted);
  let best = null;
  counted.forEach(([start]) => {
    let held = 0;
    let last = start;
    for (let offset = 0; offset < span; offset += 1) {
      const count = byYear.get(start + offset) || 0;
      held += count;
      if (count) last = start + offset;
    }
    if (!best || held > best.held) best = { from: start, to: last, held };
  });
  return { ...best, share: best.held / total };
};

// The favourite's own biggest style, as long as it is within the person's
// taste (a picked genre or one of its nearby shades): Basic Channel's Dub
// Techno years make a Dub Techno string even for someone who only picked
// Techno, but never a Deep House string for them.
const topStyleFor = (signal, allowed, known) => Object.entries(signal.styles || {})
  .sort((a, b) => b[1] - a[1])
  .map(([style]) => style)
  .find(style => known.includes(style) && allowed.has(style)) || null;

const rangeLabel = window => (window.from === window.to ? String(window.from) : `${window.from}–${String(window.to).slice(2)}`);

// "Basic Channel made lots of dub techno in 2007–08" → a Dub Techno string
// for those years. Several picks pointing at the same style+years merge.
const eraRecipes = ({ signals, genres, known }) => {
  const allowed = new Set([...genres, ...genres.flatMap(genre => STYLE_FAMILIES[genre] || [])]);
  const merged = new Map();
  Object.values(signals || {}).forEach(signal => {
    if (!signal?.n || signal.n < MIN_ERA_RELEASES) return;
    const window = peakWindow(signal.years);
    if (!window || window.share < MIN_ERA_SHARE || window.held < MIN_ERA_RELEASES) return;
    const style = topStyleFor(signal, allowed, known);
    if (!style) return;
    const key = `${style}|${window.from}`;
    const entry = merged.get(key) || { style, window, names: [], weight: 0 };
    entry.names.push(signal.name);
    entry.weight += window.held * window.share;
    merged.set(key, entry);
  });
  return [...merged.values()]
    .sort((a, b) => b.weight - a.weight)
    .map(({ style, window, names }) => ({
      id: `era:${style}:${window.from}`,
      kind: 'era',
      mode: 'depth',
      title: `${style} · ${rangeLabel(window)}`,
      subtitle: `The years ${names[0]}${names.length > 1 ? ' and others' : ''} lean on`,
      // One search per year of the window — a pair of years is one string.
      queries: Array.from({ length: window.to - window.from + 1 }, (_, index) => ({ style, year: window.from + index })),
    }));
};

const genreRecipe = style => ({
  id: `genre:${style}`,
  kind: 'genre',
  mode: 'depth',
  title: style,
  subtitle: 'Across the years',
  queries: [{ style }],
});

const familyRecipe = (style, parent) => ({
  id: `family:${style}`,
  kind: 'family',
  mode: 'depth',
  title: style,
  subtitle: `A shade of ${parent}`,
  queries: [{ style }],
});

const decadeRecipe = (style, decade, rand) => ({
  id: `decade:${style}:${decade}`,
  kind: 'decade',
  mode: 'depth',
  title: `${style} · ${decade}s`,
  subtitle: 'One decade at a time',
  queries: [{ style, year: decade + Math.floor(rand() * 10) }],
});

// Closest-to-the-picks strings: more from the label each pick lives on. Only
// built for profiles that still want the near neighbours.
const orbitRecipes = ({ favoriteArtists, favoriteLabels, probes }) => {
  const labels = new Map();
  favoriteLabels.forEach(fav => labels.set(fav.name, fav.name));
  favoriteArtists.forEach(fav => {
    const top = homeLabel(probes[`artist:${fav.discogsId}`]);
    if (top) labels.set(top, fav.name);
  });
  return [...labels.entries()].map(([label, via]) => ({
    id: `orbit:${label}`,
    kind: 'orbit',
    mode: 'essentials',
    title: `From the ${label} corner`,
    subtitle: `Close to ${via}`,
    queries: [{ label }],
  }));
};

const freshRecipe = ({ genres, rand, year }) => {
  const style = genres.length ? genres[Math.floor(rand() * genres.length)] : null;
  return {
    id: `fresh:${style || 'any'}`,
    kind: 'fresh',
    mode: 'fresh',
    title: style ? `New in ${style}` : 'New this year',
    subtitle: 'Out lately, ready to play',
    queries: [{ ...(style ? { style } : {}), year }],
  };
};

// Zip lists so no single kind of string fills the top of the page.
const interleave = lists => {
  const out = [];
  const longest = Math.max(0, ...lists.map(list => list.length));
  for (let index = 0; index < longest; index += 1) lists.forEach(list => list[index] && out.push(list[index]));
  return out;
};

// One genre picked → the same genre in several decades and in its nearby
// styles. Several picked → one string each (plus era strings from the favourites).
const baseGenreRecipes = ({ genres, rand }) => {
  if (genres.length !== 1) return genres.map(genreRecipe);
  const [only] = genres;
  const family = shuffled(STYLE_FAMILIES[only] || [], rand).map(style => familyRecipe(style, only));
  const decades = shuffled(DECADES, rand).map(decade => decadeRecipe(only, decade, rand));
  return [genreRecipe(only), ...interleave([family, decades])];
};

export const buildRecipes = ({ profile, genres, signals, favoriteArtists, favoriteLabels, probes, knownStyles, rand, year }) => {
  const era = eraRecipes({ signals, genres, known: knownStyles });
  const base = baseGenreRecipes({ genres, rand });
  // One genre means the page is about range — its decades and shades — so the
  // page is a little longer and the close-neighbour strings are kept to one.
  const single = genres.length === 1;
  const limit = single ? Math.max(profile.rows, SINGLE_GENRE_ROWS) : profile.rows;
  const orbitCount = single ? Math.min(profile.orbitRows, 1) : profile.orbitRows;
  const orbit = orbitCount ? orbitRecipes({ favoriteArtists, favoriteLabels, probes }).slice(0, orbitCount) : [];
  const fresh = profile.newRow ? [freshRecipe({ genres, rand, year })] : [];
  // Several genres but few strings (no favourites to read eras from): top up
  // with the nearby shades of each, so a daily digger still gets a full page.
  const shades = genres.length > 1
    ? interleave(genres.map(genre => shuffled(STYLE_FAMILIES[genre] || [], rand).filter(style => !genres.includes(style)).map(style => familyRecipe(style, genre))))
    : [];
  // The personal (era) strings lead, with the plain genre strings between
  // them; the close-neighbour strings sit third so a short page keeps them.
  const lead = [...fresh, ...interleave([era, base]), ...shades];
  const ordered = [...lead.slice(0, 2), ...orbit, ...lead.slice(2)];
  const seen = new Set();
  return ordered.filter(recipe => !seen.has(recipe.id) && seen.add(recipe.id)).slice(0, limit);
};

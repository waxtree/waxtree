import { useCallback, useEffect, useState } from 'react';
import { digProfile } from '@/lib/dashboardProfile';
import { hashSeed, seededRandom } from '@/lib/dashboardRandom';
import { buildNeighbourhood, createUsedSet, homeLabel, pickForRow } from '@/lib/dashboardRanking';
import { buildRecipes } from '@/lib/dashboardRecipes';
import { mergeYearWeights, tasteFromLikes } from '@/lib/dashboardTaste';
import { favoriteKey } from '@/lib/favorites';
import { STYLE_FAMILIES } from '@/lib/styleFamilies';
import { mapLimit } from '@/lib/mapLimit';

// One key, holding only the finished strings (a few dozen compact records),
// never the raw 100-release search pages — localStorage quota has bitten this
// app before. Valid for the rest of the local day and for the same taste.
const CACHE_KEY = 'wt-dash-v2';
const LEGACY_CACHE_KEY = 'wt-dash-v1';
const FETCH_LANES = 2;
const PROBE_LIMIT = 6;
// A string with fewer records than this isn't worth a row (a thin sample, or
// most of it filtered out as already owned / too obvious).
const MIN_ROW_ITEMS = 3;
// How long the first build waits on the "too obvious" lookups (the circles
// are paced requests) before going ahead without them; both are cached, so
// a later build has them.
const NEIGHBOUR_WAIT_MS = 6000;

const dayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = value => {
  try {
    localStorage.removeItem(LEGACY_CACHE_KEY);
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // No room or no storage: the dashboard just rebuilds next time.
  }
};

// Everything that should rebuild the dashboard when it changes — and nothing
// that shouldn't (the favourites' year histograms are covered by their counts).
const tasteSignature = ({ onboarding, favoriteArtists, favoriteLabels }) => JSON.stringify([
  onboarding.role,
  onboarding.frequency,
  [...onboarding.genres].sort(),
  favoriteArtists.map(favoriteKey).sort(),
  favoriteLabels.map(favoriteKey).sort(),
  Object.entries(onboarding.signals || {}).map(([key, signal]) => [key, signal.n]).sort(),
]);

// Same page asked twice (React strict mode, a retry, a Shuffle landing on the
// same page) is one request. Promises are cached so concurrent callers share it.
const searches = new Map();
const searchOnce = (actions, params, page) => {
  const key = JSON.stringify([params, page]);
  if (!searches.has(key)) {
    const request = actions.searchDashboardReleases({ ...params, page: String(page) })
      .then(response => response.results)
      .catch(error => {
        searches.delete(key);
        throw error;
      });
    searches.set(key, request);
  }
  return searches.get(key);
};

// A random page is a guess (Discogs reports page counts only with the page
// itself): past the end it errors or comes back empty, so fall back to page 1.
const searchWithFallback = async (actions, params, page) => {
  if (page > 1) {
    try {
      const results = await searchOnce(actions, params, page);
      if (results.length) return results;
    } catch {
      // fall through to page 1
    }
  }
  return searchOnce(actions, params, 1);
};

const pageCap = query => (query.label ? 2 : query.year ? 3 : 20);

const planRecipe = (recipe, rand) => ({
  recipe,
  searches: recipe.queries.map(query => ({
    params: query.label ? { label: query.label } : { genre: 'Electronic', ...query },
    page: 1 + Math.floor(rand() * pageCap(query)),
  })),
});

const loadPool = async (actions, plan) => {
  const settled = await Promise.allSettled(plan.searches.map(search => searchWithFallback(actions, search.params, search.page)));
  const fulfilled = settled.filter(result => result.status === 'fulfilled');
  return { pool: fulfilled.flatMap(result => result.value), failed: fulfilled.length === 0 };
};

const skeleton = recipe => ({ id: recipe.id, kind: recipe.kind, title: recipe.title, subtitle: recipe.subtitle, status: 'loading', items: [] });

// Resolves to a flat list of names, or to [] if the lookups take too long.
const namesWithin = async lookups => {
  const giveUp = new Promise(resolve => { setTimeout(() => resolve([]), NEIGHBOUR_WAIT_MS); });
  return (await Promise.race([Promise.all(lookups), giveUp])).flat();
};

// The styles that count as "theirs" when ranking: picked genres and their
// shades, the favourites' main styles and every style their likes touch.
const tasteFor = (onboarding, likeTaste) => {
  const styles = new Set([...onboarding.genres, ...onboarding.genres.flatMap(genre => STYLE_FAMILIES[genre] || [])]);
  Object.values(onboarding.signals || {}).forEach(signal => Object.keys(signal.styles || {}).slice(0, 3).forEach(style => styles.add(style)));
  Object.keys(likeTaste.styleWeight).forEach(style => styles.add(style));
  const strongest = Math.max(0, ...Object.values(likeTaste.styleWeight));
  const affinity = strongest ? Object.fromEntries(Object.entries(likeTaste.styleWeight).map(([style, weight]) => [style, weight / strongest])) : {};
  return { styles, affinity };
};

const probesFor = async (actions, favoriteArtists, favoriteLabels) => {
  const picks = [
    ...favoriteArtists.slice(-PROBE_LIMIT).map(fav => ['artist', fav]),
    ...favoriteLabels.slice(-PROBE_LIMIT).map(fav => ['label', fav]),
  ].filter(([, fav]) => fav.discogsId);
  const probes = {};
  await mapLimit(picks, FETCH_LANES, async ([kind, fav]) => {
    const probe = await actions.probeFavoriteTaste(fav, kind);
    if (probe) probes[`${kind}:${fav.discogsId}`] = probe;
  });
  return probes;
};

// Builds the Home dashboard: a list of strings (rows), each a few records,
// derived from the onboarding taste data and cached for the day.
export const useDashboard = (state, actions) => {
  const [today, setToday] = useState(dayKey);
  const [salt, setSalt] = useState(() => readCache()?.salt || 0);
  const [attempt, setAttempt] = useState(0);
  const [rows, setRows] = useState(() => {
    const cached = readCache();
    return cached && cached.day === dayKey() && cached.signature === tasteSignature(state) ? cached.rows.map(row => ({ ...row, status: 'ready' })) : [];
  });
  const signature = tasteSignature(state);

  // A tab left open past midnight rebuilds when it is looked at again.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setToday(dayKey()); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached && cached.day === today && cached.signature === signature && cached.salt === salt) {
      setRows(cached.rows.map(row => ({ ...row, status: 'ready' })));
      return undefined;
    }
    let cancelled = false;
    const { onboarding, favoriteArtists, favoriteLabels } = state;
    const profile = digProfile(onboarding);

    const build = async () => {
      // Deep diggers never get the picks' immediate neighbours: their Discogs
      // circles (Basic Channel → Maurizio) and their home labels' rosters.
      const artistPicks = favoriteArtists.slice(-PROBE_LIMIT);
      const circles = profile.excludeNeighbours ? namesWithin(artistPicks.map(fav => actions.getArtistCircle(fav.discogsId))) : [];
      const probes = await probesFor(actions, favoriteArtists, favoriteLabels);
      const rosters = profile.excludeNeighbours
        ? namesWithin(artistPicks.map(fav => homeLabel(probes[`artist:${fav.discogsId}`])).filter(Boolean).map(label => actions.getLabelRoster(label)))
        : [];
      const nearbyArtists = [...(await circles), ...(await rosters)];
      if (cancelled) return;
      const seed = hashSeed(`${signature}|${today}|${salt}`);
      const rand = seededRandom(seed);
      const likeTaste = tasteFromLikes(state.likedTracks);
      const recipes = buildRecipes({
        profile,
        genres: onboarding.genres,
        signals: onboarding.signals,
        likeTaste,
        yearWeights: mergeYearWeights(likeTaste.yearWeight, onboarding.signals),
        favoriteArtists,
        favoriteLabels,
        probes,
        knownStyles: actions.exploreStyles,
        rand,
        year: new Date().getFullYear(),
      });
      const plans = recipes.map(recipe => planRecipe(recipe, rand));
      setRows(recipes.map(skeleton));

      const neighbourhood = buildNeighbourhood({ favoriteArtists, favoriteLabels, probes, nearbyArtists });
      const taste = tasteFor(onboarding, likeTaste);
      const owned = { ids: new Set(state.discogsCollReleaseIds), masters: new Set(state.discogsCollMasterIds) };
      const listened = new Set(state.alreadyListened);
      const used = createUsedSet();
      const pickRand = seededRandom(seed ^ 0x9e3779b9);
      const finished = new Array(plans.length);
      const built = [];
      let nextToPick = 0;
      const settle = () => {
        // Strings are filled strictly in order so a record shown in an earlier
        // string can never repeat in a later one, whatever order the searches land in.
        while (nextToPick < plans.length && finished[nextToPick]) {
          const index = nextToPick;
          const { pool, failed } = finished[index];
          const { recipe } = plans[index];
          const items = failed ? [] : pickForRow(pool, {
            mode: recipe.mode,
            depth: profile.depth,
            taste,
            excludeNeighbours: profile.excludeNeighbours,
            neighbourhood,
            owned,
            listened,
            used,
            rand: pickRand,
            count: profile.perRow,
            spreadYears: !recipe.queries.some(query => query.year),
          });
          const status = failed ? 'error' : 'ready';
          if (items.length >= MIN_ROW_ITEMS) built.push({ id: recipe.id, kind: recipe.kind, title: recipe.title, subtitle: recipe.subtitle, items });
          setRows(current => current.map((row, rowIndex) => (rowIndex === index ? { ...row, items, status } : row)));
          nextToPick += 1;
        }
      };

      await mapLimit(plans, FETCH_LANES, async (plan, index) => {
        finished[index] = await loadPool(actions, plan);
        if (!cancelled) settle();
      });
      // Only a complete, error-free, non-empty build is worth keeping for the day.
      if (!cancelled && built.length && finished.every(result => !result.failed)) writeCache({ day: today, signature, salt, rows: built });
    };

    build().catch(() => {
      if (cancelled) return;
      // Something unexpected (not a plain Discogs failure, which a row already
      // reports): show it as failed so "Try again" appears instead of an
      // endless "Building…".
      setRows(current => (current.length
        ? current.map(row => (row.status === 'loading' ? { ...row, status: 'error' } : row))
        : [{ id: 'build', kind: 'error', title: '', subtitle: '', status: 'error', items: [] }]));
    });
    return () => { cancelled = true; };
    // state is the engine's one mutable object: its relevant parts are covered by `signature`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, signature, today, salt, attempt]);

  const shuffle = useCallback(() => setSalt(value => value + 1), []);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const loading = rows.some(row => row.status === 'loading');
  const failedRows = rows.filter(row => row.status === 'error').length;
  const visibleRows = rows.filter(row => row.status !== 'ready' || row.items.length >= MIN_ROW_ITEMS);
  const allFailed = rows.length > 0 && failedRows === rows.length;
  return {
    rows: visibleRows,
    // No strings yet at all: the favourites are still being read.
    building: rows.length === 0,
    loading,
    allFailed,
    // Every string came back too thin to show (all owned, listened or too obvious).
    empty: rows.length > 0 && !loading && !allFailed && visibleRows.length === 0,
    shuffle,
    retry,
    profile: digProfile(state.onboarding),
  };
};

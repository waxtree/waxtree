// How the dashboard digs for someone, from the two onboarding answers that
// shape it. `depth` is the one dial: 1 = far from the obvious (obscure picks,
// never the immediate neighbours of what you already named), 0 = the
// essentials and the close family. Frequency sets the base (daily diggers
// already know the neighbourhood and want plenty), the role nudges it (a
// DJ needs deeper, a casual listener nearer).
const BASE_DEPTH = { daily: 0.85, weekly: 0.65, biweekly: 0.5, monthly: 0.3, random: 0.35 };
const ROLE_DEPTH = { dj: 0.15, digger: 0.05, listener: -0.2 };
// How many strings, and how many records in each. Daily = always plenty;
// monthly = a short, curated page.
const SHAPE = {
  daily: { rows: 10, perRow: 14 },
  weekly: { rows: 6, perRow: 12 },
  biweekly: { rows: 6, perRow: 10 },
  monthly: { rows: 5, perRow: 8 },
  random: { rows: 4, perRow: 8 },
};

// How the cadence reads in the dashboard's one-line summary.
export const FREQUENCY_PHRASE = { daily: 'every day', weekly: 'every week', biweekly: 'every 14 days', monthly: 'every month', random: 'whenever there is time' };

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export const digProfile = ({ role, frequency }) => {
  const known = BASE_DEPTH[frequency] === undefined ? 'weekly' : frequency;
  const depth = clamp(BASE_DEPTH[known] + (ROLE_DEPTH[role] ?? 0), 0, 1);
  const { rows, perRow } = SHAPE[known];
  return {
    frequency: known,
    depth,
    rows,
    perRow,
    // Month-or-less diggers get "what came out lately, ready to play".
    newRow: known === 'monthly' || known === 'random',
    // Strings built around the favourites' own label family. None for the
    // deepest diggers (they know it); more of them the nearer the profile.
    orbitRows: depth >= 0.85 ? 0 : depth >= 0.45 ? 1 : 2,
    // From here up, the deep strings leave out the favourites' own labels and
    // artists, so what's left is "like it, but not the obvious".
    excludeNeighbours: depth >= 0.6,
  };
};

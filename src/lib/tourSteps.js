// The walkthrough shown once after the onboarding. Each step points at a real
// part of the app (a `target` CSS selector, or none for a centred card) and
// explains it; the middle of the tour is a real dig — open a favourite artist,
// follow its label, follow one of the label's artists — so the
// artist → label → artist loop is learnt by doing it.
//
// A step can have:
//   target(ctx)          selector of the element to spotlight (null = centred)
//   title / body         text, plain or (ctx, state) => text
//   mobileBody           body on a phone, where the tree sits behind the ☰ menu
//   interactive          the person has to do something; the step advances by
//                        itself when done(state, ctx) returns a ctx patch
//   wait(state, ctx)     'loading' (Next disabled) | 'error' | null
//   onEnter({ actions, state, ctx })
//   primary              { label(ctx), run({ actions, state, ctx }) → ctx patch }
//   requiresArtist       left out when there's no Discogs favourite artist to dig from

const nodeOf = (state, id) => state.nodes.find(node => node.id === id) || null;

// Nothing to wait for when an earlier step was skipped and there's no node.
const nodeWait = (state, id) => {
  if (!id) return null;
  const node = nodeOf(state, id);
  if (!node || node.loading || (!node.loaded && !node.error)) return 'loading';
  return node.error ? 'error' : null;
};

// A node of `type` that wasn't there when the step began — or, when Explore
// hit something already in the tree (addNode then just selects it), the newly
// selected node of that type.
const arrivedNode = (state, ctx, type) => state.nodes.find(node => node.type === type && !ctx.snapshot.has(node.id))
  || (state.selectedId !== ctx.selectedAtEnter ? state.nodes.find(node => node.id === state.selectedId && node.type === type) : null)
  || null;

const openSidebar = ({ actions }) => actions.mutateState(value => { value.sidebarOpen = true; });

// The favourite to dig from: a Discogs artist pick, preferring a smaller
// catalogue (it loads faster) that still has a few releases.
export const pickTourArtist = state => {
  const signals = state.onboarding.signals || {};
  const picks = state.favoriteArtists.filter(fav => fav.discogsId);
  if (!picks.length) return null;
  const size = fav => signals[`artist:${fav.discogsId}`]?.n ?? 50;
  const [best] = [...picks].sort((a, b) => (size(a) >= 3 ? size(a) : 999) - (size(b) >= 3 ? size(b) : 999));
  return { id: best.discogsId, name: best.name };
};

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to WaxTree',
    body: 'A two-minute tour of the main buttons, then your first real dig: artist → label → artist. You can skip it, but it’s worth it.',
    onEnter: ({ actions }) => actions.showDashboard(),
  },
  {
    id: 'home',
    target: () => '[data-tour="home"]',
    title: 'Home',
    body: 'This is Home: fresh picks every day, tuned to your taste. Click the WaxTree logo any time to come back here.',
  },
  {
    id: 'dashboard',
    target: () => '[data-tour="dashboard-row"]',
    title: 'Your daily digs',
    body: 'Strings of records picked from your favourites and your likes. Open a record to play it, like it or explore it — the more you like, the sharper these get.',
  },
  {
    id: 'search',
    target: () => '[data-tour="search"]',
    title: 'Search',
    body: 'Look up any artist, label or track. The Explore pill switches to browsing by genre and year.',
  },
  {
    id: 'dig-start',
    requiresArtist: true,
    title: 'Now, a real dig',
    body: ctx => `WaxTree is built on one move: follow the label, then its artists, then their labels… Let’s start from ${ctx.artist.name}, one of your favourites.`,
    primary: {
      label: ctx => `Open ${ctx.artist.name}`,
      run: ({ actions, state, ctx }) => {
        const existing = state.nodes.find(node => node.discogsId === ctx.artist.id && node.branchId === state.activeBranchId);
        if (existing) actions.selectNode(existing.id);
        else actions.addNode('artist', ctx.artist.id, ctx.artist.name, null, state.activeBranchId);
        // addNode/selectNode select the node synchronously.
        return { artistNodeId: state.selectedId };
      },
    },
  },
  {
    id: 'artist-page',
    requiresArtist: true,
    target: () => '[data-tour="node-header"]',
    title: ctx => ctx.artist.name,
    body: 'An artist page: every release, playable track by track. Each record also shows the label it came out on.',
    wait: (state, ctx) => nodeWait(state, ctx.artistNodeId),
  },
  {
    id: 'explore-label',
    requiresArtist: true,
    interactive: true,
    target: () => '[data-tour="release-explore"]',
    title: 'Follow the label',
    body: 'Press Explore on a record and pick its label. It lands in your tree on the left — you stay right here.',
    mobileBody: 'Press Explore on a record and pick its label. It lands in your tree (the ☰ menu) — you stay right here.',
    done: (state, ctx) => {
      const label = arrivedNode(state, ctx, 'label');
      return label ? { labelNodeId: label.id } : null;
    },
  },
  {
    id: 'open-label',
    requiresArtist: true,
    interactive: true,
    target: ctx => (ctx.labelNodeId ? `[data-tour-node="${ctx.labelNodeId}"]` : null),
    title: 'It’s in your tree',
    body: 'Every Explore adds a branch to your tree. Click the label to open it.',
    mobileBody: 'Every Explore adds a branch to your tree. Open the ☰ menu, top left, and tap the label to open it.',
    onEnter: openSidebar,
    done: (state, ctx) => (state.selectedId === ctx.labelNodeId ? {} : null),
  },
  {
    id: 'label-page',
    requiresArtist: true,
    target: () => '[data-tour="node-header"]',
    title: 'A label page',
    body: 'Everything released on this label — and the artists behind it. This is where the new names come from.',
    wait: (state, ctx) => nodeWait(state, ctx.labelNodeId),
  },
  {
    id: 'explore-artist',
    requiresArtist: true,
    interactive: true,
    target: () => '[data-tour="release-explore"]',
    title: 'Now follow an artist',
    body: 'Press Explore on a record that catches your eye and pick one of its artists.',
    done: (state, ctx) => {
      const artist = arrivedNode(state, ctx, 'artist');
      return artist ? { secondArtistNodeId: artist.id } : null;
    },
  },
  {
    id: 'loop',
    target: () => '[data-tour="sidebar"]',
    title: 'That’s the WaxTree loop',
    body: 'Artist → label → artist → label… Every jump grows your tree, and the trail is also shown above the page, so you never lose your way back. The tabs on top keep separate digs on separate branches.',
    onEnter: openSidebar,
  },
  {
    id: 'track-actions',
    target: () => '[data-tour="track-actions"]',
    title: 'Play, like, save',
    body: 'Play any track, ♥ like it (likes tune your Home page) or tag it into a playlist.',
  },
  {
    id: 'player',
    target: () => '#right-panel',
    title: 'Now playing',
    body: 'What’s playing lives here, with related tracks to keep the dig going.',
  },
  {
    id: 'sidebar-toggle',
    target: () => '[data-tour="sidebar-toggle"]',
    title: 'Show or hide your tree',
    body: 'This handle opens and closes your tree. It slides open by itself whenever you start digging.',
    mobileBody: 'On a phone your tree lives behind the ☰ menu, top left — open it any time to jump back along the trail.',
  },
  {
    id: 'done',
    title: 'You’re ready',
    body: 'Logo for Home, Explore to follow labels and artists, ♥ for what you love. You can take this tour again from Settings.',
    primary: { label: () => 'Start digging', run: () => ({}) },
  },
];

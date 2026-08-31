import { Component, useEffect, useState } from 'react';
import { AppFailure } from '@/components/AppFailure';
import { SUPABASE_KEY, supabase as sb } from '@/lib/supabase';

// TEMPORARY, dev-only verification/reference harness — deleted (and its
// route in App.jsx reverted) before any commit on whatever branch this
// lands on. Patches getSession to a fake session BEFORE importing the
// engine (its own boot IIFE hard-redirects to /login on a real null
// session); access_token is set to the project's own anon/publishable key
// so supabase-js's functions.invoke sends something the edge gateway's
// verify_jwt check accepts. Seeds a rich, realistic (real Discogs artist/
// label/release data, not placeholder) tree so screenshots taken here
// look like genuine app usage, not an empty demo state.
localStorage.setItem('discogs_token', 'dev-preview-token');
sb.auth.getSession = async () => ({ data: { session: { user: { id: 'dev-preview', email: 'dev@preview.local' }, access_token: SUPABASE_KEY } }, error: null });

class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) return <AppFailure error={this.state.error} />;
    return this.props.children;
  }
}

const salonTracks = [
  { id: 'salon-1-1', album: 'Wait LP', title: "Wait (Anneke Laurent Remix)", trackArtistName: "Lil' Mark, Jason Hodges", releaseArtistName: "Lil' Mark, Jason Hodges", label: 'Salon Records', duration: '7:39', year: 2026, genre: 'House · Deep House', videoId: null, thumbUrl: null, catno: 'SALON022' },
  { id: 'salon-1-2', album: 'Wait LP', title: 'Wait (Instrumental)', trackArtistName: "Lil' Mark, Jason Hodges", releaseArtistName: "Lil' Mark, Jason Hodges", label: 'Salon Records', duration: '5:33', year: 2026, genre: 'House · Deep House', videoId: null, thumbUrl: null, catno: 'SALON022' },
  { id: 'salon-2-1', album: 'Pass It Around', title: 'Pass It Around', trackArtistName: 'DJ Sneak', releaseArtistName: 'DJ Sneak', label: 'Salon Records', duration: '6:09', year: 2024, genre: 'House · Tech House', videoId: 'dQw4w9WgXcQ', thumbUrl: null, catno: 'SALON021' },
  { id: 'salon-2-2', album: 'Pass It Around', title: 'House Bullet', trackArtistName: 'DJ Sneak', releaseArtistName: 'DJ Sneak', label: 'Salon Records', duration: '7:00', year: 2024, genre: 'House · Tech House', videoId: 'dQw4w9WgXcQ', thumbUrl: null, catno: 'SALON021' },
  { id: 'salon-3-1', album: 'Secret Chamber', title: 'Dark Mix', trackArtistName: "Steve O'Sullivan", releaseArtistName: "Steve O'Sullivan", label: 'Salon Records', duration: '6:42', year: 2024, genre: 'Tech House · Minimal · Dub', videoId: null, thumbUrl: null, catno: 'SALON019' },
  { id: 'salon-3-2', album: 'Secret Chamber', title: 'Original Mix', trackArtistName: "Steve O'Sullivan", releaseArtistName: "Steve O'Sullivan", label: 'Salon Records', duration: '7:12', year: 2024, genre: 'Tech House · Minimal · Dub', videoId: null, thumbUrl: null, catno: 'SALON019' },
  { id: 'salon-4-1', album: 'Voodoo', title: 'Voodoo', trackArtistName: 'DJ Sneak', releaseArtistName: 'DJ Sneak', label: 'Salon Records', duration: '6:35', year: 2024, genre: 'House · Tech House', videoId: null, thumbUrl: null, catno: 'SALON 020' },
  { id: 'salon-4-2', album: 'Voodoo', title: 'Feeling Of Power', trackArtistName: 'DJ Sneak', releaseArtistName: 'DJ Sneak', label: 'Salon Records', duration: '6:32', year: 2024, genre: 'House · Tech House', videoId: null, thumbUrl: null, catno: 'SALON 020' },
];

const presenceTracks = [
  { id: 'pres-1-1', album: 'The Strength', title: "Feelin' Lifted", trackArtistName: 'Presence', releaseArtistName: 'Presence', label: 'Pariter', duration: '5:47', year: 2026, genre: 'Deep House', videoId: 'ubRR8PLqe8g', thumbUrl: null, catno: 'PAR011' },
  { id: 'pres-1-2', album: 'The Strength', title: 'The Strength (Within)', trackArtistName: 'Presence', releaseArtistName: 'Presence', label: 'Pariter', duration: '6:20', year: 2026, genre: 'Deep House', videoId: null, thumbUrl: null, catno: 'PAR011' },
];

export const DevMobilePreview = () => {
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    document.title = 'WaxTree dev preview';
    Promise.all([import('@/lib/waxTreeEngine.jsx'), import('@/components/WaxTreeApp.jsx')]).then(([engine, view]) => {
      const { state } = engine.getWaxTreeState();
      const mainBranch = 'devbranch1';
      const secondBranch = 'devbranch2';
      state.branches = [
        { id: mainBranch, name: 'Late Night Digging', rootId: 'label-1' },
        { id: secondBranch, name: 'Deep House Crate', rootId: 'artist-2' },
      ];
      state.activeBranchId = mainBranch;
      state.nodes = [
        {
          id: 'label-1', type: 'label', discogsId: 128974, name: 'Salon Records', branchId: mainBranch, parentId: null,
          loaded: true, loading: false, error: null, pinned: true, tags: ['house'],
          data: {
            imageUrl: null, trackCount: 42,
            bio: 'House music label founded by DJ Jon Attend / Etlon Jon in 2007 and based between Paris and Berlin. Musical orientation is minimal house and house. Distributed initially by Intergroove, Syncrophone and now Decks.de',
            highlights: {},
            correlatedArtists: [],
            sublabels: [],
            parentLabel: null,
            tracks: salonTracks,
          },
        },
        {
          id: 'artist-1', type: 'artist', discogsId: 44125, name: 'DJ Sneak', branchId: mainBranch, parentId: 'label-1',
          loaded: true, loading: false, error: null, pinned: false, tags: [],
          data: { imageUrl: null, trackCount: 312, bio: null, highlights: {}, correlatedArtists: [], aliases: [], tracks: [] },
        },
        {
          id: 'artist-2', type: 'artist', discogsId: 262838, name: 'Presence', branchId: secondBranch, parentId: null,
          loaded: true, loading: false, error: null, pinned: false, tags: ['deep house', 'favorite'],
          data: {
            imageUrl: null, trackCount: 61,
            bio: 'Presence is a subdivision of Sushitech Records. Unveiling the raw, classic house/techno sound of the label. Curated by Yossi Amoyal.',
            highlights: {},
            correlatedArtists: ['Terry Francis', 'Justin Bailey', 'The Ron Honey Experience'],
            aliases: [],
            tracks: presenceTracks,
          },
        },
        {
          id: 'artist-3', type: 'artist', discogsId: 9001, name: "Steve O'Sullivan", branchId: secondBranch, parentId: null,
          loaded: true, loading: false, error: null, pinned: false, tags: [],
          data: { imageUrl: null, trackCount: 137, bio: null, highlights: {}, correlatedArtists: [], aliases: [], tracks: [] },
        },
      ];
      state.selectedId = 'label-1';
      // Suppress the first-time "Welcome to WaxTree" Sync prompt (fires
      // automatically for any account with nothing synced yet) — this
      // harness exists to show the digging view itself, not the onboarding
      // modal.
      state.librariesModal = false;
      state.welcomeSyncIntro = false;
      state.likes = { 'salon-2-1': true, 'salon-3-1': true };
      state.follows = [
        { discogs_id: 128974, type: 'label', name: 'Salon Records', thumb: null },
        { discogs_id: 262838, type: 'artist', name: 'Presence', thumb: null },
      ];
      state.dasAscoltare = [
        { id: 'salon-3-1', title: 'Dark Mix', album: 'Secret Chamber', artistName: "Steve O'Sullivan", videoId: null, thumbUrl: null },
      ];
      setLoaded({ engine, View: view.WaxTreeApp });
    });
  }, []);

  if (!loaded) return <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Loading dev preview…</div>;
  const { engine, View } = loaded;
  return <Boundary><View engine={engine} /></Boundary>;
};

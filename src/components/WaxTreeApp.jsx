import { ArrowUpRight, ChevronDown, Heart, Tag } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CookieBanner, ThemeFrame } from '@/components/AppChrome';
import { ArtistIcon } from '@/components/waxtree/icons/ArtistIcon';
import { LabelIcon } from '@/components/waxtree/icons/LabelIcon';
import { Content } from '@/components/waxtree/Content';
import { Header } from '@/components/waxtree/Header';
import { Modal } from '@/components/waxtree/Modal';
import { PlaylistDrop } from '@/components/waxtree/PlaylistDrop';
import { PlaylistsModal } from '@/components/waxtree/PlaylistsModal';
import { QueueRow } from '@/components/waxtree/QueueRow';
import { RightPanel } from '@/components/waxtree/RightPanel';
import { SectionHeader } from '@/components/waxtree/SectionHeader';
import { Sidebar } from '@/components/waxtree/Sidebar';
import { SidebarResize } from '@/components/waxtree/SidebarResize';
import { buttonPrimary, buttonSecondary, modalInput } from '@/lib/waxtreeUi';

export const WaxTreeApp = ({ engine }) => {
  useSyncExternalStore(engine.subscribeWaxTree, engine.getWaxTreeSnapshot, engine.getWaxTreeSnapshot);
  const { state, ready, session } = engine.getWaxTreeState();
  const actions = engine.waxTreeActions;
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem('wt-sb-w'));
    return saved >= 160 && saved <= 520 ? saved : 252;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    // WaxTreeApp drives its theme from the engine's own state.theme, not
    // AppChrome's useTheme() hook (that's only used by the auth pages) —
    // confirmed live 2026-08-08: switching theme in-app updated data-theme
    // (so ThemeFrame's own --wt-* variables, passed as a prop, followed
    // correctly) but never touched the .dark class, which is what
    // Tailwind's dark: variant and every shadcn color token actually key
    // off. Every component just converted to shadcn tokens (Sidebar,
    // Header, Content, TrackRow, RightPanel, ...) was left stuck on
    // whichever theme index.html's hardcoded initial class="dark"
    // happened to be, regardless of later in-app toggles.
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  if (!ready) return <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Checking session…</div>;

  return (
    <ThemeFrame theme={state.theme} className="h-dvh overflow-hidden text-sm">
      <div className="flex h-dvh flex-col overflow-hidden" translate="no">
        <Header state={state} session={session} actions={actions} />
        <div style={{ '--wt-app-columns': `${sidebarWidth}px 4px minmax(0,1fr) 260px` }} className="grid min-h-0 flex-1 grid-cols-[var(--wt-app-columns)] overflow-hidden max-[900px]:grid-cols-[210px_3px_minmax(0,1fr)]">
          <Sidebar state={state} actions={actions} />
          <SidebarResize width={sidebarWidth} onResize={setSidebarWidth} />
          <Content state={state} actions={actions} />
          <RightPanel state={state} actions={actions} />
        </div>
      </div>
      <ModalLayer state={state} session={session} actions={actions} />
      {state.levelToast && (
        <div className="fixed bottom-20 left-1/2 z-[1000] flex min-w-[270px] -translate-x-1/2 items-center gap-3 rounded-[14px] border-[1.5px] border-primary bg-card px-[18px] py-3.5 shadow-[0_8px_32px_rgba(0,0,0,.6)]">
          <span className="text-[28px]">🌳</span>
          <div><div className="font-bold">{state.levelToast.title}</div><div className="text-xs text-muted-foreground">{state.levelToast.tagline}</div></div>
        </div>
      )}
      <CookieBanner includeSentry app user={session?.user} />
    </ThemeFrame>
  );
};

const ModalLayer = ({ state, session, actions }) => {
  if (state.playlistsModal) return <PlaylistsModal state={state} actions={actions} />;
  if (state.likesModal) return <LikesModal state={state} actions={actions} />;
  if (state.historyModal) return <HistoryModal state={state} actions={actions} />;
  if (state.librariesModal) return <LibrariesModal state={state} actions={actions} />;
  if (state.followsModal) return <FollowsModal state={state} actions={actions} />;
  if (state.profileModal) return <ProfileModal state={state} session={session} actions={actions} />;
  if (state.levelsModal) return <LevelsModal state={state} actions={actions} />;
  if (state.settingsModal) return <SettingsModal state={state} session={session} actions={actions} />;
  if (state.heroesModal) return <HeroesModal state={state} actions={actions} />;
  if (state.newReleasesModal) return <NewReleasesModal state={state} actions={actions} />;
  if (state.premiumModal) return <Modal title="Feature coming soon" close={() => actions.mutateState(value => { value.premiumModal = false; })} maxWidth="400px"><div className="text-center"><div className="mb-2 text-4xl">🔒</div><p className="mb-5 text-[13px] leading-5 text-muted-foreground">We're still working on this — it'll be available soon. Thanks for testing WaxTree!</p><button type="button" className={`${buttonPrimary} w-full py-2.5`} onClick={() => actions.mutateState(value => { value.premiumModal = false; })}>Got it</button></div></Modal>;
  return null;
};

const LikesModal = ({ state, actions }) => {
  const close = () => actions.mutateState(value => { value.likesModal = false; });
  const tracks = Object.keys(state.likes).filter(id => state.likes[id]).map(id => state.likedTracks[id] || actions.findTrack(id)).filter(Boolean);
  const groups = tracks.reduce((result, track) => { const genres = (track.genre || 'Unknown').split(' · '); genres.forEach(genre => { (result[genre] ||= []).push(track); }); return result; }, {});
  return (
    <Modal title="♥ My Likes" close={close} maxWidth="620px">
      {tracks.length ? Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([genre, items]) => (
        <div key={genre}>
          <SectionHeader title={`${genre} · ${items.length}`} />
          {items.map(track => <QueueRow key={`${genre}-${track.id}`} track={track} actions={actions} onPlay={() => { actions.doPlay(track.id, track.videoId, track.title, track.artistName || track.trackArtistName || ''); close(); }} onRemove={() => actions.toggleLike(track.id)} />)}
        </div>
      )) : <p className="py-8 text-center text-xs text-muted-foreground/70">No liked tracks — use ♡ on tracks to add them</p>}
    </Modal>
  );
};

const HistoryModal = ({ state, actions }) => {
  const close = () => actions.mutateState(value => { value.historyModal = false; });
  const openEntry = entry => {
    const existing = state.nodes.find(node => node.discogsId === entry.exploreId || node.name === (entry.exploreName || entry.artistName));
    if (existing) actions.selectNode(existing.id);
    else if (entry.exploreId) actions.addNode(entry.exploreType || 'artist', entry.exploreId, entry.exploreName || entry.artistName, null, state.activeBranchId);
    close();
  };
  return (
    <Modal title="🕓 History" close={close}>
      {state.history.length ? (
        <>
          <div className="mb-2 flex justify-end"><button type="button" className={buttonSecondary} onClick={() => { if (confirm('Clear history?')) actions.mutateState(value => { value.history = []; }); }}>Clear history</button></div>
          {state.history.map((entry, index) => (
            <div key={`${entry.trackId || entry.id}-${entry.ts || index}`} className="flex items-center gap-3 border-b border-border py-2">
              {entry.thumbUrl ? <img className="size-10 rounded-lg object-cover" src={entry.thumbUrl} alt="" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">♫</div>}
              <div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{entry.title}</strong><span className="text-[11px] text-muted-foreground">{[entry.artistName, entry.ts ? new Date(entry.ts).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''].filter(Boolean).join(' · ')}</span></div>
              {entry.videoId && <button type="button" onClick={() => { actions.doPlay(entry.id, entry.videoId, entry.title, entry.artistName); close(); }} className="text-primary">▶</button>}
              <button type="button" className={buttonSecondary} onClick={() => openEntry(entry)}>Open</button>
            </div>
          ))}
        </>
      ) : <p className="py-8 text-center text-xs text-muted-foreground/70">No tracks yet — listen to something for 3 seconds</p>}
    </Modal>
  );
};

const ProfileModal = ({ state, session, actions }) => {
  const close = () => actions.mutateState(value => { value.profileModal = false; });
  const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'Profile';
  const avatar = actions.getAvatarUrl();
  const [artistQuery, setArtistQuery] = useState('');
  const [artistResults, setArtistResults] = useState([]);
  const artistSearchTimer = useRef(null);
  // Total nodes across every branch, not search-bar use — see addNode's
  // own comment in waxTreeEngine.jsx for why.
  const nodeCount = state.nodes.length;
  const level = actions.getLevelFromCount(nodeCount);
  const progress = actions.getProgressToNext(nodeCount);
  // Vinyl specifically, not vinyl+digital combined — matches what the user
  // actually means by "my collection" (My Libraries' own Vinyl count) and
  // what they're counting by hand ("805 records, 200+ are Dub Techno") when
  // judging whether this reflects their real taste.
  const genreCounts = state.discogsCollection.filter(release => release.isVinyl).reduce((result, release) => {
    (release.genres || []).forEach(genre => { result[genre] = (result[genre] || 0) + 1; });
    return result;
  }, {});
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const updateArtistQuery = event => {
    const q = event.target.value;
    setArtistQuery(q);
    clearTimeout(artistSearchTimer.current);
    if (!q.trim()) { setArtistResults([]); return; }
    // Same debounced-live-search shape as the main search bar (Search.jsx's
    // own liveSearchTick) — separate local state here rather than reusing
    // state.q/state.results, which back the actual search bar and would
    // otherwise collide with it.
    artistSearchTimer.current = setTimeout(() => { actions.searchArtistsForFavorites(q).then(setArtistResults); }, 300);
  };
  const pickFavoriteArtist = result => {
    setArtistQuery('');
    setArtistResults([]);
    if (state.favoriteArtists.some(artist => artist.discogsId === result.id)) return;
    actions.mutateState(value => { value.favoriteArtists = [...value.favoriteArtists, { name: result.title, discogsId: result.id }]; });
  };
  return (
    <Modal title="🌲 My Profile" close={close}>
      <div className="flex flex-col items-center gap-2 border-b border-border py-4">
        {avatar ? <img className="size-20 rounded-full object-cover" src={avatar} alt="" /> : <div className="flex size-20 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-primary">{username.slice(0, 2).toUpperCase()}</div>}
        <strong className="text-base">{username}</strong>
      </div>
      <div className="border-b border-border pb-4">
        <span className="mb-2 block text-[10px] font-bold uppercase text-muted-foreground/70">Favorite Artists</span>
        {state.favoriteArtists.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {state.favoriteArtists.map(artist => (
              <span key={artist.discogsId} className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                {artist.name}
                <button type="button" onClick={() => actions.mutateState(value => { value.favoriteArtists = value.favoriteArtists.filter(item => item.discogsId !== artist.discogsId); })} className="text-muted-foreground/70 hover:text-destructive">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <input value={artistQuery} onChange={updateArtistQuery} placeholder="Add an artist..." className={modalInput} />
          {artistResults.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[310] max-h-[220px] overflow-y-auto rounded-lg border border-border bg-card shadow-[var(--wt-shadow)]">
              {artistResults.slice(0, 10).map(result => (
                <button key={result.id} type="button" onClick={() => pickFavoriteArtist(result)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted">
                  {result.thumb ? <img className="size-7 shrink-0 rounded object-cover" src={result.thumb} alt="" /> : <div className="flex size-7 shrink-0 items-center justify-center rounded bg-secondary text-muted-foreground"><ArtistIcon className="size-3.5" /></div>}
                  <span className="truncate text-[12.5px]">{result.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="border-b border-border py-4 text-center"><strong className="block text-xl">{level.title}</strong><span className="mt-1 block text-[13px] text-muted-foreground">{level.tagline}</span></div>
      {level.level < 15 && (
        <>
          <div className="mt-3.5 h-1.5 overflow-hidden rounded bg-secondary"><div style={{ width: `${progress}%` }} className="h-full rounded bg-primary" /></div>
          <p className="mt-1 text-[11px] text-muted-foreground">{progress}% to next level</p>
        </>
      )}
      <div className="mt-4">
        <span className="mb-2 block text-[10px] font-bold uppercase text-muted-foreground/70">Top Genres</span>
        {topGenres.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {topGenres.map(([genre, count]) => {
              const color = actions.genreColor(genre);
              return <span key={genre} style={{ backgroundColor: `${color}1A`, borderColor: `${color}66`, color }} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] border px-2 py-1 text-[11px] font-bold">{genre}<span className="opacity-70">· {count}</span></span>;
            })}
          </div>
        ) : (
          <p className="text-[11.5px] leading-5 text-muted-foreground/70">
            {state.discogsCollection.some(release => release.isVinyl) ? "Your synced collection doesn't have genre data yet — hit Sync now in My Libraries to refresh it." : 'Sync your Discogs vinyl collection to see your top genres.'}
          </p>
        )}
      </div>
    </Modal>
  );
};

const LevelsModal = ({ state, actions }) => {
  const close = () => actions.mutateState(value => { value.levelsModal = false; });
  // Total nodes across every branch, not search-bar use — see addNode's
  // own comment in waxTreeEngine.jsx for why.
  const nodeCount = state.nodes.length;
  const level = actions.getLevelFromCount(nodeCount);
  const progress = actions.getProgressToNext(nodeCount);
  return (
    <Modal title="🌳 Digging Levels" close={close}>
      <div className="border-b border-border py-4 text-center"><strong className="block text-xl">{level.title}</strong><span className="mt-1 block text-[13px] text-muted-foreground">{level.tagline}</span></div>
      {level.level < 15 && (
        <>
          <div className="mt-3.5 h-1.5 overflow-hidden rounded bg-secondary"><div style={{ width: `${progress}%` }} className="h-full rounded bg-primary" /></div>
          <p className="mt-1 text-[11px] text-muted-foreground">{progress}% to next level</p>
        </>
      )}
      <div className="mt-4 flex flex-col gap-1.5">
        {Array.from({ length: 15 }, (_, index) => index + 1).map(number => {
          const item = actions.getLevelFromCount(number === 15 ? 10001 : [0, 21, 61, 121, 201, 351, 501, 751, 1001, 1501, 2001, 3001, 4501, 6501, 10001][number - 1]);
          const unlocked = nodeCount >= item.min;
          return (
            <div key={number} className={`flex gap-2.5 rounded-[10px] border p-2.5 ${item.level === level.level ? 'border-primary bg-muted' : 'border-transparent bg-secondary'} ${unlocked ? '' : 'opacity-30'}`}>
              <span className="w-[18px] text-[11px] text-muted-foreground/70">{number}</span>
              <div><strong className="block text-[13px]">{item.title}</strong>{unlocked && <span className="text-[11px] text-muted-foreground">{item.tagline}</span>}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

const FollowsModal = ({ state, actions }) => {
  const close = () => actions.mutateState(value => { value.followsModal = false; });
  return (
    <Modal title="Following" close={close}>
      {state.follows.length ? state.follows.map(follow => (
        <div key={`${follow.type}-${follow.discogs_id}`} className="flex items-center gap-2.5 border-b border-border py-2">
          {follow.image_url ? <img className="size-10 rounded-lg object-cover" src={follow.image_url} alt="" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">{follow.type === 'label' ? <LabelIcon className="size-4" /> : <ArtistIcon className="size-4" />}</div>}
          <strong className="min-w-0 flex-1 truncate text-[13px]">{follow.name}</strong>
          <button type="button" className={buttonSecondary} onClick={() => { const existing = state.nodes.find(node => node.discogsId === follow.discogs_id && node.branchId === state.activeBranchId); if (existing) actions.selectNode(existing.id); else actions.addNode(follow.type, follow.discogs_id, follow.name, null, state.activeBranchId); close(); }}>Open ›</button>
          <button type="button" className="text-destructive" onClick={() => actions.toggleFollow({ discogsId: follow.discogs_id, type: follow.type, name: follow.name })}>×</button>
        </div>
      )) : <p className="py-8 text-center text-xs text-muted-foreground/70">No followed artists or labels yet</p>}
    </Modal>
  );
};

const LibrariesModal = ({ state, actions }) => {
  const [scanStatus, setScanStatus] = useState('');
  // Local to the modal, not persisted state — same treatment as
  // librariesSearch's own scope, but genres are meaningful per-tab (vinyl
  // and digital can have entirely different genre sets), so switching tabs
  // resets the selection instead of silently filtering the new tab against
  // genres that may not even exist in it.
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  useEffect(() => { setSelectedGenres([]); }, [state.librariesTab]);
  const close = () => {
    if (state.discogsSyncing) return;
    actions.mutateState(value => { value.librariesModal = false; value.welcomeSyncIntro = false; });
  };
  const vinylEntries = state.discogsCollection.filter(release => release.isVinyl);
  const digitalEntries = actions.getDigitalLibraryEntries();
  const source = state.librariesTab === 'vinyl' ? vinylEntries : digitalEntries;
  const allGenres = [...new Set(source.flatMap(release => release.genres || []))].sort();
  const toggleGenre = genre => setSelectedGenres(prev => (prev.includes(genre) ? prev.filter(item => item !== genre) : [...prev, genre]));
  const query = state.librariesSearch.trim().toLowerCase();
  const filtered = (query ? source.filter(release => [release.title, release.artist, release.labelExploreName, ...(release.genres || [])].filter(Boolean).join(' ').toLowerCase().includes(query)) : source)
    .filter(release => !selectedGenres.length || (release.genres || []).some(genre => selectedGenres.includes(genre)));
  const tabs = [
    ['vinyl', '💽 Vinyl', vinylEntries.length],
    ['digital', '💾 Digital', digitalEntries.length],
    ['sync', '🔄 Sync', state.discogsCollSyncedAt || state.ownedTracks.length ? '✓' : ''],
  ];

  const openEntity = (type, id, name) => {
    if (!id) return;
    const existing = state.nodes.find(node => node.discogsId === id && node.branchId === state.activeBranchId);
    actions.mutateState(value => { value.librariesModal = false; });
    if (existing) actions.selectNode(existing.id);
    else actions.addNode(type, id, name, null, state.activeBranchId);
  };

  const scanFolder = async () => {
    setScanStatus('Choose your music folder. Everything is read locally.');
    try {
      const result = await actions.linkLibrary((done, total) => setScanStatus(total ? `Parsing ${done} / ${total}…` : `Collecting files… ${done || ''}`));
      if (!result) { setScanStatus(''); return; }
      setScanStatus(`Done — ${result.count} tracks indexed across ${result.stats.dirs} folders.`);
      actions.mutateState(() => {});
    } catch (error) {
      setScanStatus(error.message);
    }
  };

  return (
    <Modal title="💿 My Libraries" close={close} maxWidth="820px">
      <div className="my-3 flex gap-2">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => actions.mutateState(value => { value.librariesTab = key; })}
            className={`flex-1 rounded-[10px] border-[1.5px] p-2.5 text-[13px] font-semibold ${state.librariesTab === key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >
            {label}{count !== '' ? ` (${count})` : ''}
          </button>
        ))}
      </div>

      {state.librariesTab === 'sync' ? (
        <div className="py-3">
          {state.welcomeSyncIntro && <div className="mb-4 rounded-lg bg-primary/10 p-3"><strong className="block text-[13px]">Welcome to WaxTree!</strong><p className="mt-1 text-[12px] leading-5 text-muted-foreground">Add your music by linking your local folder and connecting your Discogs account below. Matching tracks will be tagged while you dig.</p></div>}
          <p className="mb-4 text-[12px] text-muted-foreground">Connect your music sources — matching tracks get tagged while you dig.</p>

          <SectionHeader title="💾 Local Music Folder" />
          <div className="flex flex-wrap items-center gap-2 py-3">
            <div className="min-w-[180px] flex-1"><strong className="block text-[13px]">Music folder</strong><span className="text-[11px] text-muted-foreground">{state.ownedTracks.length ? `${state.ownedTracks.length} tracks indexed` : 'No folder linked yet'}</span></div>
            <button type="button" onClick={scanFolder} className={buttonSecondary}>{state.ownedTracks.length ? 'Rescan' : 'Link folder'}</button>
            {state.ownedTracks.length > 0 && <button type="button" title="Checks each distinct artist in your library against Discogs — keeps running in the background even if you close this window" disabled={state.libraryMatchRunning} onClick={actions.matchLibraryWithDiscogs} className={buttonSecondary}>{state.libraryMatchRunning ? `Matching artists ${state.libraryMatchProgress.done}/${state.libraryMatchProgress.total}` : 'Match library'}</button>}
            {scanStatus && <p className="basis-full text-[11px] text-muted-foreground">{scanStatus}</p>}
            {state.libraryMatchRunning && <p className="basis-full text-[11px] text-muted-foreground">Checking Discogs one artist at a time — {digitalEntries.length} tracks matched so far. This keeps running in the background even if you close this window; reopen Sync any time to check progress.</p>}
          </div>

          <SectionHeader title="🎵 Discogs Collection" />
          {!state.discogsUser ? (
            <div className="py-3">
              <p className="mb-3 text-[12px] text-muted-foreground">Connect your Discogs account to sync your collection and wantlist.</p>
              <button type="button" onClick={async () => { try { await actions.connectDiscogs(); } catch (error) { alert(`Discogs connection failed: ${error.message}`); } }} className="w-full rounded-xl border-[1.5px] border-[#555] bg-[#333] px-4 py-2.5 text-[13px] font-semibold text-white">Connect with Discogs</button>
            </div>
          ) : (
            <div className="py-3">
              <div className="mb-3 rounded-lg bg-secondary p-3 text-[12px] text-muted-foreground">
                <strong className="block text-foreground">Connected as @{state.discogsUser}</strong>
                {state.discogsCollSyncedAt && <span>Last synced: {new Date(state.discogsCollSyncedAt).toLocaleString()} · {state.discogsCollection.length} releases · {state.discogsWantlist.length} wanted</span>}
              </div>
              <button type="button" disabled={state.discogsSyncing} onClick={async () => { try { await actions.syncDiscogsAccount(); } catch (error) { alert(`Sync failed: ${error.message}`); } }} className={`${buttonPrimary} w-full py-2.5 disabled:opacity-50`}>{state.discogsSyncing ? 'Syncing…' : 'Sync now'}</button>
              <button type="button" onClick={() => actions.mutateState(value => { value.heroesModal = true; value.librariesModal = false; })} className={`${buttonSecondary} mt-2 w-full`}>🌲 Follow Your Heroes</button>
              <button type="button" onClick={() => { if (confirm('Disconnect Discogs account?')) actions.disconnectDiscogs(); }} className={`${buttonSecondary} mt-2 w-full`}>Disconnect Discogs account</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <input value={state.librariesSearch} onChange={event => actions.mutateState(value => { value.librariesSearch = event.target.value; })} className={`${modalInput} my-3`} placeholder="Search artist, release or label…" />
          {allGenres.length > 0 && (
            <div className="relative mb-3 inline-block">
              <button
                type="button"
                onClick={() => setGenreMenuOpen(value => !value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${selectedGenres.length ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
              >
                Select by Genre{selectedGenres.length ? ` (${selectedGenres.length})` : ''}
                <ChevronDown className="size-3" />
              </button>
              {genreMenuOpen && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-[310] max-h-[280px] w-[320px] overflow-y-auto rounded-lg border border-border bg-card p-2.5 shadow-[var(--wt-shadow)]">
                  <div className="flex flex-wrap gap-1.5">
                    {allGenres.map(genre => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${selectedGenres.includes(genre) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="max-h-[420px] overflow-y-auto">
            {filtered.length ? filtered.map((release, index) => (
              <div key={release.discogsUrl || `${release.title}-${index}`} className="flex items-center gap-2.5 border-b border-border py-2">
                {release.thumb ? <img className="size-10 rounded-lg object-cover" src={release.thumb} alt="" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">♫</div>}
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px]">{release.title}</strong>
                  <span className="block truncate text-[11px] text-muted-foreground">{[release.artist, release.year, release.labelExploreName].filter(Boolean).join(' · ')}</span>
                  {release.genres?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{release.genres.map(genre => <span key={genre} className="rounded border border-primary/30 px-1.5 text-[9px] text-primary">{genre}</span>)}</div>}
                </div>
                {release.artistExploreId && <button type="button" className={`${buttonSecondary} inline-flex items-center gap-0.5`} onClick={() => openEntity(release.artistExploreType || 'artist', release.artistExploreId, release.artistExploreName)}>Artist<ArrowUpRight className="size-3" /></button>}
                {release.labelExploreId && <button type="button" className={`${buttonSecondary} inline-flex items-center gap-0.5`} onClick={() => openEntity('label', release.labelExploreId, release.labelExploreName)}>Label<ArrowUpRight className="size-3" /></button>}
              </div>
            )) : (
              <button type="button" onClick={() => { if (!source.length) actions.mutateState(value => { value.librariesTab = 'sync'; }); }} className="w-full py-8 text-center text-xs text-muted-foreground/70">
                {source.length ? `No matches for "${state.librariesSearch.trim()}".` : state.librariesTab === 'vinyl' ? 'Sync your Discogs collection to see it here.' : state.ownedTracks.length ? 'No matches yet — explore an artist or label whose tracks are in your local folder.' : 'Link your local music folder to see it here.'}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
};

const SettingsModal = ({ state, session, actions }) => {
  const close = () => actions.mutateState(value => { value.settingsModal = false; });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const avatar = actions.getAvatarUrl();
  const changePassword = async () => {
    if (password.length < 8) return setMessage('Minimum 8 characters.');
    if (password !== confirmPassword) return setMessage('Passwords do not match.');
    const { error } = await actions.supabase.auth.updateUser({ password });
    setMessage(error ? error.message : 'Password updated successfully.');
    if (!error) { setPassword(''); setConfirmPassword(''); }
  };
  return (
    <Modal title="⚙ My Settings" close={close}>
      <SectionHeader title="Account" />
      <div className="flex items-center justify-between py-3"><div><strong className="block text-[13px]">Email</strong><span className="text-[11px] text-muted-foreground">{session?.user?.email}</span></div></div>
      <div className="flex items-center gap-3 border-t border-border py-3">
        {avatar ? <img className="size-12 rounded-full object-cover" src={avatar} alt="" /> : <div className="flex size-12 items-center justify-center rounded-full bg-secondary">👤</div>}
        <div className="min-w-0 flex-1"><strong className="block text-[13px]">Profile photo</strong><span className="text-[11px] text-muted-foreground">{avatar ? 'Linked to your account' : 'No photo yet'}</span></div>
        <label className={`${buttonSecondary} cursor-pointer`}>
          {uploading ? 'Uploading…' : avatar ? 'Change photo' : 'Add photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); try { await actions.uploadAvatar(file); } catch (error) { alert(error.message); } setUploading(false); }} />
        </label>
      </div>
      <div className="border-t border-border py-3">
        <div className="flex items-center justify-between">
          <div><strong className="block text-[13px]">Password</strong><span className="text-[11px] text-muted-foreground">Set a new password for your account</span></div>
          <button type="button" className={buttonSecondary} onClick={() => setPasswordOpen(value => !value)}>{passwordOpen ? 'Cancel' : 'Change'}</button>
        </div>
        {passwordOpen && (
          <div className="mt-3">
            <input className={`${modalInput} mb-2`} value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="New password (min. 8 chars)" />
            <input className={modalInput} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} type="password" placeholder="Confirm new password" />
            <p className="my-2 text-xs text-muted-foreground">{message}</p>
            <div className="text-right"><button type="button" className={buttonPrimary} onClick={changePassword}>Save password</button></div>
          </div>
        )}
      </div>
      <SectionHeader title="Data" />
      <div className="flex items-center justify-between py-3">
        <div><strong className="block text-[13px]">Listen history</strong><span className="text-[11px] text-muted-foreground">{state.history.length} tracks listened</span></div>
        <button type="button" className={buttonSecondary} onClick={() => { if (confirm('Clear listen history?')) actions.mutateState(value => { value.history = []; value.listens = {}; }); }}>Clear</button>
      </div>
      <div className="flex items-center justify-between border-t border-border py-3">
        <div><strong className="block text-[13px] text-destructive">⚠ Delete account</strong><span className="text-[11px] text-muted-foreground">Permanently delete your account and all data</span></div>
        <button
          type="button"
          className="rounded-full border border-destructive px-3.5 py-1.5 text-xs text-destructive"
          onClick={async () => {
            if (prompt('Type DELETE to confirm:') !== 'DELETE') return;
            const { data: { session: activeSession } } = await actions.supabase.auth.getSession();
            const response = await fetch('/api/delete-account', { method: 'POST', headers: { Authorization: `Bearer ${activeSession.access_token}` } });
            if (!response.ok) return alert('Failed to delete account');
            await actions.supabase.auth.signOut();
            window.location.href = '/login';
          }}
        >
          Delete
        </button>
      </div>
    </Modal>
  );
};

const HeroesModal = ({ state, actions }) => {
  const close = () => actions.mutateState(value => { value.heroesModal = false; });
  const heroes = actions.computeDiggingHeroes(true);
  return (
    <Modal title="🌲 Follow Your Heroes" close={close} maxWidth="640px" subtitle="We looked through your collection, wantlist and local library — these are the artists and labels you keep coming back to.">
      {[['Artists you dig', heroes.artists, 'artist'], ['Labels you dig', heroes.labels, 'label']].map(([title, items, type]) => items.length > 0 && (
        <div key={type}>
          <SectionHeader title={title} />
          {items.map(item => {
            const followed = state.follows.some(follow => follow.discogs_id === item.id && follow.type === type);
            return (
              <div key={item.id} className="flex items-center gap-3 border-b border-border py-2">
                {item.thumb ? <img className="size-11 rounded-lg object-cover" src={item.thumb} alt="" /> : <div className="flex size-11 items-center justify-center rounded-lg bg-secondary">{type === 'label' ? '🏷️' : '🎤'}</div>}
                <div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{item.name}</strong><span className="text-[11px] text-muted-foreground">{item.collectionCount || 0} releases · {item.libraryCount || 0} library tracks</span></div>
                <button type="button" className={buttonSecondary} onClick={() => actions.toggleFollow({ discogsId: item.id, type, name: item.name, data: { imageUrl: item.thumb } })}>{followed ? '✓ Following' : '+ Follow'}</button>
                <button type="button" className={buttonSecondary} onClick={() => { actions.addNode(type, item.id, item.name, null, state.activeBranchId); close(); }}>Open ›</button>
              </div>
            );
          })}
        </div>
      ))}
    </Modal>
  );
};

const NewReleasesModal = ({ state, actions }) => {
  const close = () => actions.mutateState(value => { value.newReleasesModal = false; });
  return (
    <Modal title="New releases" close={close}>
      {state.newReleasesFound.length ? state.newReleasesFound.map((release, index) => <NewReleaseRow key={`${release.followType}-${release.followDiscogsId}-${release.track?.id || index}`} release={release} state={state} actions={actions} close={close} />) : <p className="py-8 text-center text-xs text-muted-foreground/70">No new releases</p>}
    </Modal>
  );
};

const NewReleaseRow = ({ release, state, actions, close }) => {
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const track = release.track;
  if (!track) return null;
  const artistName = track.trackArtistName || release.followName;
  const queuedTrack = { ...track, artistName };
  const liked = !!state.likes[track.id];
  const queued = state.dasAscoltare.some(item => item.id === track.id);
  return (
    <div className="relative flex items-center gap-3 border-b border-border py-2">
      {track.thumbUrl ? <img className="size-11 rounded-lg object-cover" src={track.thumbUrl} alt="" /> : <div className="flex size-11 items-center justify-center rounded-lg bg-secondary">💿</div>}
      <div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{release.releaseTitle || track.album || track.title}</strong><span className="text-[11px] text-muted-foreground">New from {release.followName}{track.year ? ` · ${track.year}` : ''}</span></div>
      {track.videoId && <button type="button" onClick={() => { actions.doPlay(track.id, track.videoId, track.title, artistName); close(); }} className="text-primary">▶</button>}
      <button type="button" title="Like" onClick={() => actions.toggleLike(track.id)} className={`flex items-center justify-center ${liked ? 'text-primary' : 'text-muted-foreground/70'}`}>
        <Heart className={`size-3.5 ${liked ? 'fill-current' : ''}`} />
      </button>
      <div className="relative flex items-center">
        <button type="button" title="Add to playlist" onClick={() => setPlaylistOpen(value => !value)} className={`flex items-center justify-center ${queued ? 'text-primary' : 'text-muted-foreground/70'}`}><Tag className="size-3.5" /></button>
        {playlistOpen && <PlaylistDrop track={queuedTrack} state={state} actions={actions} onClose={() => setPlaylistOpen(false)} />}
      </div>
      <button type="button" className={buttonSecondary} onClick={() => { actions.addNode(release.followType, release.followDiscogsId, release.followName, null, state.activeBranchId); close(); }}>Explore ›</button>
    </div>
  );
};

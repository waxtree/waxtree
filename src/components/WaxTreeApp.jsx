import { ArrowUpRight, Heart, Tag } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { CookieBanner, ThemeFrame } from '@/components/AppChrome';
import { ArtistIcon } from '@/components/waxtree/icons/ArtistIcon';
import { LabelIcon } from '@/components/waxtree/icons/LabelIcon';
import { Content } from '@/components/waxtree/Content';
import { Header } from '@/components/waxtree/Header';
import { PlaylistDrop } from '@/components/waxtree/PlaylistDrop';
import { QueueRow } from '@/components/waxtree/QueueRow';
import { RightPanel } from '@/components/waxtree/RightPanel';
import { Search } from '@/components/waxtree/Search';
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
        <Search state={state} actions={actions} />
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
      <CookieBanner includeSentry app />
    </ThemeFrame>
  );
};

const ModalLayer = ({ state, session, actions }) => {
  if (state.playlistsModal) return <PlaylistsModal state={state} actions={actions} />;
  if (state.likesModal) return <LikesModal state={state} actions={actions} />;
  if (state.historyModal) return <HistoryModal state={state} actions={actions} />;
  if (state.librariesModal) return <LibrariesModal state={state} actions={actions} />;
  if (state.followsModal) return <FollowsModal state={state} actions={actions} />;
  if (state.profileModal) return <ProfileModal state={state} actions={actions} />;
  if (state.settingsModal) return <SettingsModal state={state} session={session} actions={actions} />;
  if (state.heroesModal) return <HeroesModal state={state} actions={actions} />;
  if (state.newReleasesModal) return <NewReleasesModal state={state} actions={actions} />;
  if (state.premiumModal) return <Modal title="Feature coming soon" close={() => actions.mutateState(value => { value.premiumModal = false; })} maxWidth="400px"><div className="text-center"><div className="mb-2 text-4xl">🔒</div><p className="mb-5 text-[13px] leading-5 text-muted-foreground">We're still working on this — it'll be available soon. Thanks for testing WaxTree!</p><button type="button" className={`${buttonPrimary} w-full py-2.5`} onClick={() => actions.mutateState(value => { value.premiumModal = false; })}>Got it</button></div></Modal>;
  return null;
};

const Modal = ({ title, close, children, maxWidth = '520px', subtitle }) => (
  <div onClick={close} className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 p-5">
    <section onClick={event => event.stopPropagation()} style={{ maxWidth }} className="max-h-[84vh] w-full overflow-y-auto rounded-[14px] border border-border bg-card p-[22px] shadow-[var(--wt-shadow)]">
      <div className="mb-1 flex items-center justify-between gap-4"><h2 className="text-[15px] font-bold">{title}</h2><button type="button" className={buttonSecondary} onClick={close}>×</button></div>
      {subtitle && <p className="mb-3.5 text-[12.5px] leading-5 text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  </div>
);

const PlaylistsModal = ({ state, actions }) => {
  const [name, setName] = useState('');
  const close = () => actions.mutateState(value => { value.playlistsModal = false; });
  return (
    <Modal title="🏷️ Playlists" close={close} subtitle="Create as many playlists as you like — split by genre, by a gig you're digging for, whatever makes sense to you. Rename or delete them anytime.">
      <SectionHeader title="🔖 Listen Later" count={`${state.dasAscoltare.length} tracks`} action={state.dasAscoltare.length ? () => { if (confirm('Clear Listen Later?')) actions.mutateState(value => { value.dasAscoltare = []; }); } : null} />
      {state.dasAscoltare.length ? state.dasAscoltare.map(track => <QueueRow key={track.id} track={track} actions={actions} onPlay={() => { actions.doPlay(track.id, track.videoId, track.title, track.artistName); close(); }} onRemove={() => actions.mutateState(value => { value.dasAscoltare = value.dasAscoltare.filter(item => item.id !== track.id); })} />) : <p className="py-4 text-center text-xs text-muted-foreground/70">No tracks — use 🏷️ on any track to add</p>}
      <SectionHeader title="My Playlists" count={`${state.playlists.length} playlists`} />
      <div className="my-3 flex gap-2">
        <input value={name} onChange={event => setName(event.target.value)} className={modalInput} placeholder="New playlist name…" />
        <button type="button" onClick={() => { if (!name.trim()) return; actions.mutateState(value => { value.playlists = [...value.playlists, { id: `pl-${Date.now()}`, name: name.trim(), tracks: [] }]; }); setName(''); }} className={buttonPrimary}>Create</button>
      </div>
      {state.playlists.map(playlist => (
        <div key={playlist.id} className="mb-4">
          <SectionHeader
            title={playlist.name}
            count={`${playlist.tracks.length} tracks`}
            controls={<>
              <button type="button" className={buttonSecondary} onClick={() => { const next = prompt('Playlist name:', playlist.name); if (next?.trim()) actions.mutateState(() => { playlist.name = next.trim(); }); }}>Rename</button>
              <button type="button" className={buttonSecondary} onClick={() => { if (confirm(`Delete "${playlist.name}"?`)) actions.mutateState(value => { value.playlists = value.playlists.filter(item => item.id !== playlist.id); }); }}>Delete</button>
            </>}
          />
          {playlist.tracks.length ? playlist.tracks.map(track => <QueueRow key={track.id} track={track} actions={actions} onPlay={() => { actions.doPlay(track.id, track.videoId, track.title, track.artistName); close(); }} onRemove={() => actions.mutateState(() => { playlist.tracks = playlist.tracks.filter(item => item.id !== track.id); })} />) : <p className="py-3 text-center text-xs text-muted-foreground/70">No tracks yet</p>}
        </div>
      ))}
    </Modal>
  );
};

const SectionHeader = ({ title, count, action, controls }) => (
  <div className="mt-3 flex items-center justify-between border-b border-border py-2 text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">
    <span>{title}</span>
    <div className="flex items-center gap-2 font-normal normal-case tracking-normal">{count}{action && <button type="button" className={buttonSecondary} onClick={action}>Clear</button>}{controls}</div>
  </div>
);

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

const ProfileModal = ({ state, actions }) => {
  const close = () => actions.mutateState(value => { value.profileModal = false; });
  // Total nodes across every branch, not search-bar use — see addNode's
  // own comment in waxTreeEngine.jsx for why.
  const nodeCount = state.nodes.length;
  const level = actions.getLevelFromCount(nodeCount);
  const progress = actions.getProgressToNext(nodeCount);
  return (
    <Modal title="🌲 My Profile" close={close}>
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
  const close = () => {
    if (state.discogsSyncing) return;
    actions.mutateState(value => { value.librariesModal = false; value.welcomeSyncIntro = false; });
  };
  const vinylEntries = state.discogsCollection.filter(release => release.isVinyl);
  const digitalEntries = actions.getDigitalLibraryEntries();
  const source = state.librariesTab === 'vinyl' ? vinylEntries : digitalEntries;
  const query = state.librariesSearch.trim().toLowerCase();
  const filtered = query ? source.filter(release => [release.title, release.artist, release.labelExploreName, ...(release.genres || [])].filter(Boolean).join(' ').toLowerCase().includes(query)) : source;
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

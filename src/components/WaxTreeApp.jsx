import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CookieBanner, ThemeFrame } from './AppChrome';

const buttonSecondary = 'rounded-full border border-[var(--wt-border)] px-3.5 py-1.5 text-xs text-[var(--wt-muted)] transition hover:border-[var(--wt-accent)] hover:text-[var(--wt-accent)]';
const buttonPrimary = 'rounded-full bg-[var(--wt-accent)] px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90';
const modalInput = 'w-full rounded-[10px] border-[1.5px] border-[var(--wt-border)] bg-[var(--wt-elevated)] px-3 py-2 text-[13px] outline-none focus:border-[var(--wt-accent)]';

export function WaxTreeApp({ engine }) {
  useSyncExternalStore(engine.subscribeWaxTree, engine.getWaxTreeSnapshot, engine.getWaxTreeSnapshot);
  const { state, ready, session } = engine.getWaxTreeState();
  const actions = engine.waxTreeActions;
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem('wt-sb-w'));
    return saved >= 160 && saved <= 520 ? saved : 252;
  });

  useEffect(() => { document.documentElement.dataset.theme = state.theme; }, [state.theme]);

  if (!ready) return <div className="flex min-h-dvh items-center justify-center bg-[#E8F0EA] text-sm text-[#3D6B4E]">Checking session…</div>;

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
      {state.levelToast && <div className="fixed bottom-20 left-1/2 z-[1000] flex min-w-[270px] -translate-x-1/2 items-center gap-3 rounded-[14px] border-[1.5px] border-[var(--wt-accent)] bg-[var(--wt-surface)] px-[18px] py-3.5 shadow-[0_8px_32px_rgba(0,0,0,.6)]"><span className="text-[28px]">🌳</span><div><div className="font-bold">{state.levelToast.title}</div><div className="text-xs text-[var(--wt-muted)]">{state.levelToast.tagline}</div></div></div>}
      <CookieBanner includeSentry app />
    </ThemeFrame>
  );
}

function SidebarResize({ width, onResize }) {
  const begin = event => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const move = nextEvent => onResize(Math.max(160, Math.min(520, startWidth + nextEvent.clientX - startX)));
    const finish = nextEvent => {
      const nextWidth = Math.max(160, Math.min(520, startWidth + nextEvent.clientX - startX));
      localStorage.setItem('wt-sb-w', String(nextWidth));
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', finish);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', finish);
  };

  return <div role="separator" aria-orientation="vertical" title="Resize sidebar" onMouseDown={begin} className="cursor-col-resize bg-[var(--wt-border)] transition-colors hover:bg-[var(--wt-accent)]" />;
}

function Header({ state, session, actions }) {
  const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'Profile';
  const level = actions.getLevelFromCount(state.searchCount);
  const playlistCount = state.dasAscoltare.length + state.playlists.reduce((sum, playlist) => sum + playlist.tracks.length, 0);
  const avatar = actions.getAvatarUrl();

  return (
    <header className="flex h-[50px] shrink-0 items-center gap-2.5 border-b border-[var(--wt-border)] bg-[var(--wt-surface)] px-[18px]">
      <div className="flex items-center gap-3">
        <img className="h-10 w-10 object-contain" src="/logo.svg" alt="" />
        <span className="text-2xl font-bold"><em className="font-bold not-italic text-[var(--wt-text)]">Wax</em><span className="text-[#3DAE79]">Tree</span></span>
        <span className="self-end pb-1 text-[13px] font-medium text-[var(--wt-faint)]">Beta v.1</span>
      </div>
      <div className="flex-1" />
      <button onClick={() => actions.mutateState(value => { value.playlistsModal = true; })} className={`relative rounded-full border px-3 py-1 text-xs ${playlistCount ? 'border-[var(--wt-accent)] text-[var(--wt-accent)]' : 'border-[var(--wt-border)] text-[var(--wt-muted)]'}`}>🏷️ Playlists{playlistCount > 0 && <span className="ml-1 font-bold">{playlistCount}</span>}</button>
      <button onClick={() => actions.mutateState(value => { value.profileModal = true; })} className="rounded-full border border-[var(--wt-accent)] bg-[var(--wt-accent)]/10 px-3 py-1 text-[11px] text-[var(--wt-accent)]">{level.title}</button>
      <div className="relative">
        <button onClick={event => { event.stopPropagation(); actions.mutateState(value => { value.profileOpen = !value.profileOpen; }); }} className="rounded-full border border-[var(--wt-border)] px-3 py-1 text-xs text-[var(--wt-muted)]">Profile</button>
        {state.profileOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] z-[500] min-w-[185px] overflow-hidden rounded-[14px] border border-[var(--wt-border)] bg-[var(--wt-surface)] p-1 shadow-[var(--wt-shadow)]">
            <div className="mb-1 flex items-center gap-2.5 border-b border-[var(--wt-border)] px-3 py-2">
              {avatar ? <img className="size-9 rounded-full object-cover" src={avatar} alt="" /> : <div className="flex size-9 items-center justify-center rounded-full bg-[var(--wt-elevated)] font-bold text-[var(--wt-accent)]">{username.slice(0, 2).toUpperCase()}</div>}
              <span className="text-xs font-semibold">{username}</span>
            </div>
            {[['Libraries', 'librariesModal'], ['Settings', 'settingsModal'], ['Likes', 'likesModal'], ['Follows', 'followsModal'], ['History', 'historyModal']].map(([label, key]) => <button key={key} onClick={() => actions.mutateState(value => { value.profileOpen = false; value[key] = true; })} className="block w-full rounded-lg px-3.5 py-2 text-left text-[13px] hover:bg-[var(--wt-hover)]">{label}</button>)}
            <div className="my-1 h-px bg-[var(--wt-border)]" />
            <button onClick={async () => { await actions.supabase.auth.signOut(); Object.keys(localStorage).filter(key => key.startsWith('sb-')).forEach(key => localStorage.removeItem(key)); window.location.href = '/login'; }} className="block w-full rounded-lg px-3.5 py-2 text-left text-[13px] text-[#F47B5E] hover:bg-[var(--wt-hover)]">Sign out</button>
          </div>
        )}
      </div>
      <button onClick={() => actions.setTheme(state.theme === 'dark' ? 'light' : 'dark')} className="flex size-[30px] items-center justify-center rounded-full bg-[var(--wt-elevated)] text-sm text-[var(--wt-muted)] hover:bg-[var(--wt-hover)]">{state.theme === 'dark' ? '☀' : '🌙'}</button>
    </header>
  );
}

function Search({ state, actions }) {
  const activeBranch = actions.getBranch(state.activeBranchId);
  const timer = useRef(null);
  const update = event => {
    const query = event.target.value;
    actions.mutateState(value => { value.q = query; if (!query.trim()) { value.results = []; value.err = ''; } });
    clearTimeout(timer.current);
    if (query.trim()) timer.current = setTimeout(actions.liveSearchTick, 300);
  };

  return (
    <div className="group relative shrink-0 border-b border-[var(--wt-border)] bg-[var(--wt-bg)]">
      <div className="flex gap-2.5 px-[18px] py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-full border-[1.5px] border-[var(--wt-border)] bg-[var(--wt-surface)] px-4 py-2 transition focus-within:border-[var(--wt-accent)] focus-within:shadow-[0_0_0_3px_rgba(94,196,123,.12)]">
          <span className="text-[var(--wt-faint)]">⌕</span>
          {activeBranch && <span className="shrink-0 rounded-full border border-[var(--wt-accent)] px-2 py-px text-[10px] text-[var(--wt-accent)]">{activeBranch.name}</span>}
          <input value={state.q} onChange={update} onKeyDown={event => { if (event.key === 'Enter') actions.doSearch(); if (event.key === 'Escape') actions.mutateState(value => { value.results = []; value.err = ''; }); }} className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--wt-faint)]" placeholder="Search artist, label, or track..." />
        </div>
        <button onClick={actions.doSearch} className="rounded-full bg-[var(--wt-accent)] px-[18px] py-2 text-[13px] font-semibold text-white hover:opacity-90">Search</button>
      </div>
      {(state.loading || state.err || state.results.length > 0) && (
        <div className="absolute left-[18px] right-[18px] top-[calc(100%-2px)] z-[300] max-h-[280px] overflow-y-auto rounded-b-xl border border-t-0 border-[var(--wt-border)] bg-[var(--wt-surface)] shadow-[var(--wt-shadow)]">
          {state.loading && <div className="px-3.5 py-3 text-[13px] italic text-[var(--wt-muted)]">Searching...</div>}
          {state.err && <div className="px-3.5 py-3 text-[13px] italic text-[#5EC47B]">{state.err}</div>}
          {!state.loading && state.results.slice(0, 14).map(result => <button key={`${result.type}-${result.id}`} onClick={() => actions.pickResult(result)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-[var(--wt-elevated)]"><div className="relative size-9 shrink-0">{result.thumb ? <img className="size-9 rounded-[7px] border border-[var(--wt-border)] object-cover" src={result.thumb} alt="" /> : <div className="flex size-9 items-center justify-center rounded-[7px] border border-[var(--wt-border)] bg-[var(--wt-elevated)]">{result.type === 'label' ? '🎵' : result.type === 'release' ? '💿' : '🎤'}</div>}<span className="absolute -bottom-1 -right-1 rounded bg-[var(--wt-accent)] px-1 text-[8px] font-bold text-white">{result.type === 'release' ? 'Rel.' : result.type === 'label' ? 'Label' : 'Art.'}</span></div><span><span className="block text-[13px] font-medium">{result.title}</span><span className="block text-[11px] text-[var(--wt-muted)]">{result.type === 'release' ? [result.label, result.year].filter(Boolean).join(' · ') || 'Release' : result.type === 'label' ? 'Label' : 'Artist'}</span></span></button>)}
        </div>
      )}
      {state.chips.length > 0 && <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-h-[60px] group-hover:opacity-100 group-focus-within:max-h-[60px] group-focus-within:opacity-100"><div className="flex items-center gap-1.5 overflow-x-auto border-t border-[var(--wt-border)] px-[18px] py-2"><span className="mr-2 shrink-0 text-[10px] font-bold uppercase text-[var(--wt-faint)]">Recent Searches</span>{state.chips.map(name => <button key={name} onClick={() => { const existing = state.nodes.find(node => node.name === name); if (existing) actions.selectNode(existing.id); else actions.mutateState(value => { value.q = name; actions.doSearch(); }); }} className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--wt-border)] bg-[var(--wt-surface)] px-3 py-1 text-xs text-[var(--wt-muted)] hover:border-[var(--wt-accent)]"><span>{name}</span><span onClick={event => { event.stopPropagation(); actions.removeChip(name); }} className="text-[var(--wt-faint)]">×</span></button>)}</div></div>}
    </div>
  );
}

function Sidebar({ state, actions }) {
  const branch = actions.getBranch(state.activeBranchId);
  const allTags = [...new Set(state.nodes.flatMap(node => node.tags || []))].sort();
  const branchNodes = state.nodes.filter(node => node.branchId === state.activeBranchId);
  const filtered = state.sbFilterTag ? branchNodes.filter(node => node.tags?.includes(state.sbFilterTag)) : branchNodes;
  const children = parentId => filtered.filter(node => node.parentId === parentId).sort((a, b) => state.sbPinFirst ? Number(b.pinned) - Number(a.pinned) : 0);

  let shownNodes = 0;
  const renderNodes = (parentId = null, depth = 0) => {
    const output = [];
    children(parentId).forEach(node => {
      if (!state.isPremium && shownNodes >= actions.freeNodeLimit) return;
      shownNodes += 1;
      output.push(<SidebarNode key={node.id} node={node} depth={depth} state={state} actions={actions} />);
      output.push(...renderNodes(node.id, depth + 1));
    });
    return output;
  };

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-r border-[var(--wt-border)] bg-[var(--wt-surface)]">
      <div className="flex shrink-0 items-end gap-0.5 overflow-x-auto border-b border-[var(--wt-border)] px-2 pt-2">
        {state.branches.map(item => <div key={item.id} onClick={() => actions.mutateState(value => { value.activeBranchId = item.id; })} onDoubleClick={() => { const name = prompt('Branch name:', item.name); if (name) actions.renameBranch(item.id, name); }} onDragOver={event => event.preventDefault()} onDrop={event => actions.moveNodeToBranch(event.dataTransfer.getData('text/plain'), item.id)} className={`relative -bottom-px flex shrink-0 cursor-pointer items-center gap-1 rounded-t-lg border border-b-0 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[.06em] ${state.activeBranchId === item.id ? 'border-[var(--wt-border)] bg-[var(--wt-surface)] text-[var(--wt-accent)]' : 'border-[var(--wt-border)] bg-[var(--wt-elevated)] text-[var(--wt-muted)]'}`}><span className="max-w-20 truncate">{item.name}</span>{state.branches.length > 1 && <button onClick={event => { event.stopPropagation(); if (confirm(`Delete "${item.name}"?`)) actions.removeBranch(item.id); }} className="text-[var(--wt-faint)] hover:text-[#F47B5E]">×</button>}</div>)}
        {!state.isPremium && state.branches.length >= actions.freeWoodLimit ? <button title="Feature soon unlocked" onClick={() => actions.mutateState(value => { value.premiumModal = true; })} className="px-2 py-1 text-[10px] font-bold text-[var(--wt-faint)]">Branch {actions.freeWoodLimit + 1} 🔒</button> : <button onClick={actions.addBranch} className="px-2 py-1 text-base text-[var(--wt-faint)] hover:text-[var(--wt-accent)]">+</button>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--wt-border)] p-2">
        <button onClick={() => actions.mutateState(value => { value.sbPinFirst = !value.sbPinFirst; })} className={`rounded-full border px-2 py-0.5 text-[11px] ${state.sbPinFirst ? 'border-[var(--wt-accent)] text-[var(--wt-accent)]' : 'border-[var(--wt-border)] text-[var(--wt-faint)]'}`}>Pinned first</button>
        <select value={state.sbFilterTag} disabled={!allTags.length} onChange={event => actions.mutateState(value => { value.sbFilterTag = event.target.value; })} className="min-w-0 flex-1 appearance-none rounded-full border border-[var(--wt-border)] bg-[var(--wt-elevated)] px-2 py-0.5 text-[11px] outline-none"><option value="">All tags</option>{allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}</select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">{!branchNodes.length ? <div className="p-4 text-center text-xs leading-5 text-[var(--wt-faint)]">Empty branch — search for an artist or label to start</div> : state.sbFilterTag ? (state.isPremium ? filtered : filtered.slice(0, actions.freeNodeLimit)).map(node => <SidebarNode key={node.id} node={node} depth={0} state={state} actions={actions} />) : renderNodes()}{!state.isPremium && branchNodes.length > actions.freeNodeLimit && <button onClick={() => actions.mutateState(value => { value.premiumModal = true; })} className="mx-2 mt-2 flex w-[calc(100%-16px)] items-center justify-center gap-2 rounded-lg border border-[var(--wt-border)] bg-[var(--wt-elevated)] px-2 py-2 text-[11px] text-[var(--wt-muted)]">🔒 {branchNodes.length - actions.freeNodeLimit} more <span className="rounded bg-[var(--wt-accent)]/15 px-1.5 text-[9px] font-bold text-[var(--wt-accent)]">SOON</span></button>}</div>
    </aside>
  );
}

function SidebarNode({ node, depth, state, actions }) {
  const active = node.id === state.selectedId;
  const [tagging, setTagging] = useState(false);
  const [tag, setTag] = useState('');
  return (
    <>
      <div draggable onDragStart={event => event.dataTransfer.setData('text/plain', node.id)} onClick={() => actions.selectNode(node.id)} style={{ paddingLeft: 8 + depth * 14 }} className={`group flex cursor-pointer items-start gap-1.5 border-l-2 py-[7px] pr-2.5 ${active ? 'border-[var(--wt-accent)] bg-[var(--wt-accent)]/10' : 'border-transparent hover:bg-[var(--wt-elevated)]'}`}>
        <span className="flex size-4 shrink-0 items-center justify-center text-[11px] text-[var(--wt-faint)]">{node.type === 'label' ? '◎' : '♙'}</span>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-1">{node.pinned && <span className="size-1.5 rounded-full bg-[var(--wt-accent)]" />}<span className={`min-w-0 flex-1 truncate text-[12.5px] ${active ? 'font-semibold text-[var(--wt-accent)]' : ''}`}>{node.name}</span>{node.loaded && actions.nodeFullyExplored(node) && <span className="shrink-0 rounded-full bg-[var(--wt-accent)]/15 px-1.5 text-[9px] font-semibold text-[var(--wt-accent)]">✓ All Explored</span>}</div>{node.tags?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{node.tags.map(value => <span key={value} className="rounded-full bg-[var(--wt-accent)]/10 px-1.5 text-[10px] text-[var(--wt-accent)]">#{value}</span>)}</div>}</div>
        <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100"><button title="Pin" onClick={event => { event.stopPropagation(); actions.togglePin(node.id); }}>⌖</button><button title="Tag" onClick={event => { event.stopPropagation(); setTagging(value => !value); }}>#</button><button title="Remove" onClick={event => { event.stopPropagation(); actions.removeNode(node.id); }}>×</button></div>
      </div>
      {tagging && <div style={{ paddingLeft: 30 + depth * 14 }} className="flex gap-1.5 px-2 pb-2"><input autoFocus value={tag} onChange={event => setTag(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { actions.addTag(node.id, tag); setTag(''); setTagging(false); } }} className="min-w-0 flex-1 rounded-full border border-[var(--wt-accent)] bg-[var(--wt-elevated)] px-2 py-0.5 text-[11px] outline-none" placeholder="Tag..." /></div>}
    </>
  );
}

function Content({ state, actions }) {
  const node = actions.getNode(state.selectedId);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [node?.id]);
  useEffect(() => { if (node?.loaded && node.data) void actions.fetchBandcamp(node.id, node.data.name || node.name); }, [actions, node?.data, node?.id, node?.loaded, node?.name]);

  if (!node) return <main className="flex items-center justify-center overflow-y-auto p-7 text-center text-[var(--wt-faint)]"><div><div className="text-4xl opacity-30">🌿</div><div className="mt-3 font-semibold text-[var(--wt-muted)]">No node selected</div><p className="mt-2 text-xs">Search for an artist or label and select it from the sidebar</p></div></main>;
  const chain = actions.ancestry(node.id);
  const data = node.data;
  const isLabel = node.type === 'label';
  const followed = state.follows.some(item => item.discogs_id === node.discogsId && item.type === node.type);

  return (
    <main className="min-w-0 overflow-y-auto px-7 pb-28 pt-7">
      {chain.length > 1 && <div className="mb-2.5 flex items-center gap-1 text-xs text-[var(--wt-muted)]">{chain.map((item, index) => <span key={item.id} className="flex items-center gap-1">{index > 0 && <span className="text-[var(--wt-faint)]">›</span>}<button onClick={() => actions.selectNode(item.id)} className={index === chain.length - 1 ? 'text-[var(--wt-accent)]' : 'hover:text-[var(--wt-text)]'}>{item.name}</button></span>)}</div>}
      <div className="mb-1 flex items-center gap-3">
        {data?.imageUrl ? <img className="size-[52px] rounded-[10px] border border-[var(--wt-border)] object-cover" src={data.imageUrl} alt={node.name} /> : <div className="flex size-[52px] items-center justify-center rounded-[10px] border border-[var(--wt-border)] bg-[var(--wt-elevated)] text-xl text-[var(--wt-muted)]">{isLabel ? '◎' : '♙'}</div>}
        <h1 className="min-w-0 flex-1 truncate text-[26px] font-bold">{node.name}</h1>
        <button onClick={() => actions.toggleFollow(node)} className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${followed ? 'border-[var(--wt-accent)]/50 bg-[var(--wt-accent)]/10 text-[var(--wt-accent)]' : 'border-[var(--wt-border)] text-[var(--wt-muted)] hover:border-[var(--wt-accent)]'}`}>{followed ? '✓ Following' : '+ Follow'}</button>
      </div>
      {node.loading && <PlantLoader />}
      {node.error && <div className="flex flex-col items-center gap-3 px-7 py-12 text-center"><div className="text-4xl">🌱</div><strong>{node.error}</strong><button className={buttonSecondary} onClick={() => actions.retryNode(node.id)}>Try again</button></div>}
      {data && !node.loading && !node.error && <NodeDetails node={node} data={data} isLabel={isLabel} state={state} actions={actions} page={page} setPage={setPage} />}
    </main>
  );
}

function PlantLoader() {
  return <div className="flex flex-col items-center gap-4 px-5 py-16"><div className="text-5xl animate-pulse">🌱</div><span className="text-xs tracking-[.06em] text-[var(--wt-faint)]">Loading…</span></div>;
}

function NodeDetails({ node, data, isLabel, state, actions, page, setPage }) {
  const filtered = actions.applyFilters(data.tracks || []);
  const hasFilter = state.filterTitle || state.filterFormat !== 'all' || state.filterSort !== 'default' || state.filterGenres.length > 0;
  const notOwned = filtered.filter(track => !actions.inDiscogsCollection(track));
  const ownedGroups = actions.groupTracksByRelease(filtered.filter(track => actions.inDiscogsCollection(track)));
  const groups = actions.groupTracksByRelease(notOwned);
  const listenedGroups = groups.filter(group => state.alreadyListened.includes(group.key));
  const listenedIds = new Set(listenedGroups.flatMap(group => group.tracks.flatMap(track => [track.id, ...(track.altIds || [])])));
  const browsable = notOwned.filter(track => !listenedIds.has(track.id));
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(browsable.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleGroups = actions.groupTracksByRelease(browsable.slice(safePage * pageSize, (safePage + 1) * pageSize));
  const genres = [...new Set((data.tracks || []).flatMap(track => track.genre ? track.genre.split(' · ') : []))].sort();

  useEffect(() => {
    const target = state.scrollToRelease;
    if (!target || target.nodeId !== node.id) return;
    const matches = track => track.id.split('-')[0] === String(target.releaseId)
      || (target.titleNorm && actions.normalizeStr(track.album || track.title) === target.titleNorm);
    const targetIndex = browsable.findIndex(matches);
    const targetGroup = groups.find(group => group.tracks.some(matches));
    if (targetIndex >= 0) setPage(Math.floor(targetIndex / pageSize));
    actions.mutateState(value => { value.scrollToRelease = null; });
    if (targetGroup) setTimeout(() => {
      [...document.querySelectorAll('[data-release-key]')].find(element => element.dataset.releaseKey === targetGroup.key)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }, [actions, browsable, groups, node.id, setPage, state.scrollToRelease]);

  return (
    <>
      <p className="mb-2.5 text-[13px] text-[var(--wt-muted)]">{isLabel ? 'Label' : 'Artist'} · {data.trackCount} releases on Discogs</p>
      {data.highlights && <div className="mb-3"><div className="mb-2 flex flex-wrap gap-1.5">{[data.highlights.yearRange, `${data.trackCount} release`, data.country].filter(Boolean).map(item => <span key={item} className="rounded-full border border-[var(--wt-border)] bg-[var(--wt-elevated)] px-2.5 py-1 text-[11px] text-[var(--wt-muted)]">{item}</span>)}</div>{(data.highlights.curiosity || (isLabel ? data.highlights.artistStr : data.highlights.labelStr)) && <p className="rounded-lg border-l-2 border-[var(--wt-accent)] bg-[var(--wt-elevated)] p-3 text-xs leading-5 text-[var(--wt-muted)]">{data.highlights.curiosity || (isLabel ? data.highlights.artistStr : data.highlights.labelStr)}</p>}</div>}
      {!isLabel && data.correlatedArtists?.length > 0 && <div className="mb-4"><span className="mb-2 block text-[10px] font-bold uppercase text-[var(--wt-faint)]">Related artists</span><div className="flex flex-wrap gap-1.5">{data.correlatedArtists.map(name => <button key={name} onClick={() => actions.mutateState(value => { value.q = name; actions.doSearch(); })} className={buttonSecondary}>{name}</button>)}</div></div>}
      <RelatedEntities node={node} data={data} isLabel={isLabel} actions={actions} />
      {data.bio && <div className="mb-[18px] rounded-[10px] border border-[var(--wt-border)] bg-[var(--wt-surface)] p-3.5"><p className={`text-[12.5px] leading-6 text-[var(--wt-muted)] ${state.bioOpen[node.id] ? '' : 'line-clamp-5'}`}>{data.bio}</p><button onClick={() => actions.mutateState(value => { value.bioOpen[node.id] = !value.bioOpen[node.id]; })} className="mt-2 text-xs text-[var(--wt-accent)]">{state.bioOpen[node.id] ? '▲ less' : '▼ read more'}</button></div>}
      {data.tracks?.length > 0 && (
        <>
          <div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[.06em] text-[var(--wt-faint)]">{isLabel ? 'RELEASES' : 'TRACKS'} ({data.trackCount} Discogs, {filtered.length} loaded)</p><button onClick={() => actions.mutateState(value => { value.filterOpen = !value.filterOpen; })} className={`rounded-full border px-3 py-1 text-xs ${state.filterOpen || hasFilter ? 'border-[var(--wt-accent)] text-[var(--wt-accent)]' : 'border-[var(--wt-border)] text-[var(--wt-muted)]'}`}>⚙ Filter{hasFilter ? ' •' : ''}</button></div>
          {state.filterOpen && <Filters state={state} genres={genres} resultCount={filtered.length} actions={actions} onResetPage={() => setPage(0)} />}
          <div className="mt-3 flex flex-col gap-2.5">{visibleGroups.length ? visibleGroups.map(group => <ReleaseCard key={group.key} group={group} node={node} isLabel={isLabel} state={state} actions={actions} />) : <div className="py-8 text-center text-xs text-[var(--wt-faint)]">No tracks match the filters.</div>}</div>
          {totalPages > 1 && <div className="mt-5 flex items-center justify-center gap-3"><button disabled={safePage === 0} onClick={() => setPage(value => value - 1)} className={`${buttonSecondary} disabled:opacity-30`}>← Prev</button><span className="text-xs text-[var(--wt-muted)]">Page {safePage + 1} / {totalPages}</span><button disabled={safePage >= totalPages - 1} onClick={() => setPage(value => value + 1)} className={`${buttonSecondary} disabled:opacity-30`}>Next →</button></div>}
        </>
      )}
      <ReleaseSection title="IN YOUR COLLECTION" groups={ownedGroups} node={node} isLabel={isLabel} state={state} actions={actions} />
      <ReleaseSection title="ALREADY LISTENED" groups={listenedGroups} node={node} isLabel={isLabel} state={state} actions={actions} />
    </>
  );
}

function RelatedEntities({ node, data, isLabel, actions }) {
  const entries = isLabel
    ? [data.parentLabel && { ...data.parentLabel, prefix: '↑ ' }, ...(data.sublabels || []).slice(0, 6)].filter(Boolean)
    : (data.aliases || []).slice(0, 6);
  if (!entries.length) return null;
  return <div className="mb-[18px] flex flex-wrap gap-1.5">{entries.map(entry => <button key={`${entry.type}-${entry.id}`} onClick={() => actions.addNode(entry.type || (isLabel ? 'label' : 'artist'), entry.id, entry.name, node.id, node.branchId)} className="flex items-center gap-1 rounded-full border border-[var(--wt-border)] bg-[var(--wt-surface)] px-3 py-1.5 text-xs text-[var(--wt-muted)] hover:border-[var(--wt-accent)] hover:text-[var(--wt-accent)]"><span>{entry.type === 'label' || isLabel ? '◎' : '♙'}</span>{entry.prefix || ''}{entry.name} ›</button>)}</div>;
}

function Filters({ state, genres, resultCount, actions, onResetPage }) {
  const update = mutator => { actions.mutateState(mutator); onResetPage(); };
  return <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--wt-border)] bg-[var(--wt-surface)] p-2.5"><input value={state.filterTitle} onChange={event => update(value => { value.filterTitle = event.target.value; })} className="min-w-[150px] flex-1 rounded-full border border-[var(--wt-border)] bg-[var(--wt-elevated)] px-3 py-1.5 text-xs outline-none" placeholder="Search title..." /><select value={state.filterSort} onChange={event => update(value => { value.filterSort = event.target.value; })} className="rounded-full border border-[var(--wt-border)] bg-[var(--wt-elevated)] px-3 py-1.5 text-xs"><option value="default">Default order</option><option value="antichrono">Newest first</option><option value="chrono">Oldest first</option><option value="az">A → Z</option><option value="za">Z → A</option><option value="genre">By style</option></select><select value={state.filterFormat} onChange={event => update(value => { value.filterFormat = event.target.value; })} className="rounded-full border border-[var(--wt-border)] bg-[var(--wt-elevated)] px-3 py-1.5 text-xs"><option value="all">All formats</option><option value="digital">Digital only</option><option value="vinyl">Vinyl only</option></select>{genres.length > 1 && <div className="flex flex-wrap gap-1">{genres.map(genre => <button key={genre} onClick={() => update(value => { value.filterGenres = value.filterGenres.includes(genre) ? value.filterGenres.filter(item => item !== genre) : [...value.filterGenres, genre]; })} className={`rounded-full border px-2 py-1 text-[10px] ${state.filterGenres.includes(genre) ? 'border-[var(--wt-accent)] bg-[var(--wt-accent)]/10 text-[var(--wt-accent)]' : 'border-[var(--wt-border)] text-[var(--wt-muted)]'}`}>{genre}</button>)}</div>}<span className="text-[11px] text-[var(--wt-faint)]">{resultCount} results</span><button onClick={() => update(value => { value.filterTitle = ''; value.filterFormat = 'all'; value.filterSort = 'default'; value.filterGenres = []; })} className="text-[11px] text-[var(--wt-accent)]">× Clear</button></div>;
}

function ReleaseSection({ title, groups, ...props }) {
  if (!groups.length) return null;
  return <section className="mt-8 border-t border-[var(--wt-border)] pt-4"><p className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-[var(--wt-faint)]">{title}</p><div className="flex flex-col gap-2.5">{groups.map(group => <ReleaseCard key={group.key} group={group} {...props} />)}</div></section>;
}

function ReleaseCard({ group, node, isLabel, state, actions }) {
  const tracks = group.tracks;
  const first = tracks[0];
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const allPlayed = tracks.length > 0 && tracks.every(track => state.listens[track.id]?.badged);
  const listened = state.alreadyListened.includes(group.key);
  let primaryArtist = null;
  let variousArtists = false;
  if (isLabel) {
    const counts = tracks.reduce((result, track) => {
      if (track.label) result.set(track.label, (result.get(track.label) || 0) + 1);
      return result;
    }, new Map());
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 1 || ranked[0]?.[1] / tracks.length > 0.5) primaryArtist = ranked[0]?.[0] || null;
    else if (ranked.length > 1) variousArtists = true;
  }
  const yearLabel = [first.year, isLabel ? (variousArtists ? 'Various Artists' : primaryArtist) : first.label].filter(Boolean).join(' · ');
  const genres = first.genre ? first.genre.split(' · ') : [];
  const explore = [];
  if (first.label && !first.fromLabel) explore.push({ label: `Explore label: ${first.label}`, type: 'label', id: first.labelId, name: first.label });
  tracks.forEach(track => {
    const credits = track.trackArtists?.length ? track.trackArtists : track.exploreName ? [{ id: track.exploreId, name: track.exploreName }] : [];
    credits.forEach(credit => { if (credit.name && !explore.some(item => item.id === credit.id && item.name === credit.name)) explore.push({ label: `${track.exploreLabel || 'Explore'}: ${credit.name}`, type: 'artist', id: credit.id, name: credit.name }); });
  });
  const baseCounts = tracks.reduce((result, track) => {
    const key = actions.baseTitleKey(track.title);
    result.set(key, (result.get(key) || 0) + 1);
    return result;
  }, new Map());
  tracks.forEach(track => {
    const candidate = actions.extractRemixCandidate(track.title, baseCounts.get(actions.baseTitleKey(track.title)) > 1);
    const resolved = candidate ? actions.getResolvedRemixArtist(candidate) : null;
    if (resolved && !explore.some(item => item.type === 'artist' && item.id === resolved.id)) explore.push({ label: `Explore remix artist: ${resolved.name}`, type: 'artist', id: resolved.id, name: resolved.name });
  });
  const releaseTitle = first.album || first.title;
  const bandcampDirect = actions.findBcMatch(node.id, releaseTitle) || tracks.map(track => actions.findBcMatch(node.id, track.title)).find(Boolean);
  const digitalOnly = tracks.some(track => track.digital) && !tracks.some(track => track.hasVinyl);

  const exploreItem = item => {
    if (item.id) actions.addNode(item.type, item.id, item.name, node.id, node.branchId);
    else { actions.mutateState(value => { value.q = item.name; }); actions.doSearch(); }
    setExploreOpen(false);
  };

  return (
    <article data-release-key={group.key} className="grid grid-cols-[62px_minmax(130px,190px)_minmax(260px,1fr)_auto] gap-3 rounded-[10px] border border-[var(--wt-border)] bg-[var(--wt-surface)] p-3 shadow-sm max-[1100px]:grid-cols-[54px_minmax(120px,170px)_1fr]">
      <div className="flex flex-col items-center gap-2">{first.thumbUrl ? <img className="size-[54px] rounded-lg border border-[var(--wt-border)] object-cover" src={first.thumbUrl} alt="" loading="lazy" /> : <div className="flex size-[54px] items-center justify-center rounded-lg bg-[var(--wt-elevated)] text-xl text-[var(--wt-faint)]">♫</div>}{(listened || allPlayed) && <button title={listened ? 'Remove from Already Listened' : 'Move to Already Listened'} onClick={() => actions.mutateState(value => { value.alreadyListened = listened ? value.alreadyListened.filter(key => key !== group.key) : [...value.alreadyListened, group.key]; })} className={`flex size-6 items-center justify-center rounded-full border text-xs ${listened ? 'border-[var(--wt-accent)] bg-[var(--wt-accent)] text-white' : 'border-[var(--wt-border)] text-[var(--wt-accent)]'}`}>✓</button>}</div>
      <div className="min-w-0"><h3 className="truncate text-[13px] font-semibold">{releaseTitle}</h3>{yearLabel && <p className="mt-1 text-[11px] text-[var(--wt-muted)]">{yearLabel}</p>}{genres.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{genres.map(genre => <span key={genre} className="rounded border border-[var(--wt-accent)]/30 bg-[var(--wt-accent)]/10 px-1.5 py-0.5 text-[9px] text-[var(--wt-accent)]">{genre}</span>)}</div>}</div>
      <div className="min-w-0 divide-y divide-[var(--wt-border)]">{tracks.map(track => <TrackRow key={track.id} track={track} node={node} isLabel={isLabel} primaryArtist={primaryArtist} state={state} actions={actions} playlistOpen={openPlaylist === track.id} setPlaylistOpen={open => setOpenPlaylist(open ? track.id : null)} />)}</div>
      <div className="flex min-w-[118px] flex-col items-stretch gap-1.5 max-[1100px]:col-span-3 max-[1100px]:flex-row max-[1100px]:justify-end">
        {explore.length === 1 && <button onClick={() => exploreItem(explore[0])} className="rounded-full border border-[var(--wt-accent)] px-2.5 py-1 text-[10px] text-[var(--wt-accent)]">{explore[0].label} ›</button>}
        {explore.length > 1 && <div className="relative"><button onClick={() => setExploreOpen(value => !value)} className="w-full rounded-full border border-[var(--wt-accent)] px-2.5 py-1 text-[10px] text-[var(--wt-accent)]">Explore {exploreOpen ? '▴' : '▾'}</button>{exploreOpen && <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[190px] overflow-hidden rounded-[10px] border border-[var(--wt-border)] bg-[var(--wt-surface)] shadow-[var(--wt-shadow)]">{explore.map(item => <button key={`${item.type}-${item.id}-${item.name}`} onClick={() => exploreItem(item)} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--wt-hover)]">{item.label}</button>)}</div>}</div>}
        <StoreButton source="bc" directUrl={bandcampDirect} releaseTitle={releaseTitle} artist={isLabel ? first.label : node.name} label={isLabel ? node.name : first.label} isLabel={isLabel} actions={actions} />
        <StoreButton source="bp" releaseTitle={releaseTitle} artist={isLabel ? first.label : node.name} label={isLabel ? node.name : first.label} isLabel={isLabel} actions={actions} />
        {first.discogsUrl && !digitalOnly && <a href={first.discogsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--wt-border)] px-2.5 py-1 text-center text-[10px] text-[var(--wt-muted)]">Discogs ↗</a>}
      </div>
    </article>
  );
}

function StoreButton({ source, directUrl, releaseTitle, artist, label, isLabel, actions }) {
  const [loading, setLoading] = useState(false);
  const isBandcamp = source === 'bc';
  const open = async () => {
    if (directUrl) { window.open(directUrl, '_blank', 'noreferrer'); return; }
    const nextTab = window.open('about:blank', '_blank');
    setLoading(true);
    const url = await actions.resolveStoreUrl(source, { isLabel, artist, label, title: releaseTitle });
    setLoading(false);
    if (nextTab && !nextTab.closed) nextTab.location.href = url;
    else window.open(url, '_blank', 'noreferrer');
  };
  return <button disabled={loading} onClick={open} className={`rounded-full border px-2.5 py-1 text-center text-[10px] disabled:opacity-50 ${isBandcamp ? 'border-[#1DA0C3] text-[#1DA0C3]' : 'border-[#94D500] text-[#78B000]'}`}>{loading ? '…' : `${isBandcamp ? 'Bandcamp' : 'Beatport'} ↗`}</button>;
}

function TrackRow({ track, node, isLabel, primaryArtist, state, actions, playlistOpen, setPlaylistOpen }) {
  const artist = isLabel ? track.label : (track.trackArtistName || track.releaseArtistName || node.name);
  const [helpOpen, setHelpOpen] = useState(false);
  const videoId = track.videoId || null;
  useEffect(() => { if (!videoId) actions.getTrackVideo(track, artist, isLabel ? node.name : track.label); }, [actions, artist, isLabel, node.name, track, videoId]);
  const resolvedVideo = track.videoId || actions.getTrackVideo(track, artist, isLabel ? node.name : track.label) || null;
  const liked = !!state.likes[track.id];
  const queued = state.dasAscoltare.some(item => item.id === track.id);
  const trackWithArtist = { ...track, artistName: artist };
  const owned = actions.isOwned(track.title, artist);
  const featuring = primaryArtist && track.label && track.label !== primaryArtist
    ? track.label.split(',').map(value => value.trim()).filter(value => value && actions.normalizeStr(value) !== actions.normalizeStr(primaryArtist))
    : [];

  return (
    <div className="relative flex min-h-8 items-center gap-2 py-1.5 text-xs">
      <button onClick={() => actions.doPlay(track.id, resolvedVideo, track.title, artist)} title={resolvedVideo ? 'Play' : 'Search on YouTube'} className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${resolvedVideo ? 'border-[var(--wt-accent)] text-[var(--wt-accent)]' : 'border-[var(--wt-border)] text-[var(--wt-faint)]'}`}>▶</button>
      <span className="min-w-0 flex-1 truncate">{track.title}</span>
      {featuring.length > 0 && <span className="max-w-28 truncate text-[10px] text-[var(--wt-muted)]">with {featuring.join(', ')}</span>}
      {track.duration && <span className="text-[10px] text-[var(--wt-muted)]">{track.duration}</span>}
      <button onClick={() => actions.toggleLike(track.id)} className={`text-base ${liked ? 'text-[#F47B5E]' : 'text-[var(--wt-faint)]'}`}>{liked ? '♥' : '♡'}</button>
      <div className="relative"><button onClick={() => setPlaylistOpen(!playlistOpen)} className={queued ? 'text-[var(--wt-accent)]' : 'text-[var(--wt-faint)]'}>🏷️</button>{playlistOpen && <PlaylistDrop track={trackWithArtist} node={node} state={state} actions={actions} onClose={() => setPlaylistOpen(false)} />}</div>
      {!resolvedVideo && <div className="relative"><button onClick={() => setHelpOpen(value => !value)} className="text-[var(--wt-faint)]">▾</button>{helpOpen && <div className="absolute right-0 top-full z-50 min-w-[180px] overflow-hidden rounded-[10px] border border-[var(--wt-border)] bg-[var(--wt-surface)] shadow-[var(--wt-shadow)]"><button onClick={() => { actions.mutateState(value => { value.listens[track.id] = { badged: true }; }); setHelpOpen(false); }} className="block w-full px-3 py-2 text-left hover:bg-[var(--wt-hover)]">✓ Mark as Listened</button><button onClick={() => { const input = prompt(`Paste the YouTube link for "${track.title}":`, ''); const id = actions.parseYoutubeUrlInput(input); if (!id) { if (input) alert("That doesn't look like a valid YouTube link."); return; } actions.submitYoutubeLink(track.id, id); setHelpOpen(false); }} className="block w-full px-3 py-2 text-left hover:bg-[var(--wt-hover)]">Help us with the link</button></div>}</div>}
      {owned && <span className="rounded border border-[#9B6BFF]/40 bg-[#9B6BFF]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#9B6BFF]">In your digital library</span>}
      {actions.inDiscogsCollection(track) && <span className="rounded border border-[#E8A04A]/40 bg-[#E8A04A]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#E8A04A]">In collection</span>}
      {actions.inDiscogsWantlist(track) && <span className="rounded border border-[#4A8AFF]/40 bg-[#4A8AFF]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#4A8AFF]">On Discogs' Wantlist</span>}
      {state.listens[track.id]?.badged && <span className="rounded-full bg-[var(--wt-accent)]/10 px-1.5 py-0.5 text-[9px] text-[var(--wt-accent)]">✓ listened</span>}
      {track.bpm && <span className="text-[9px] text-[var(--wt-faint)]">{track.bpm} BPM</span>}
    </div>
  );
}

function PlaylistDrop({ track, node, state, actions, onClose }) {
  const listenLater = state.dasAscoltare.some(item => item.id === track.id);
  const toggle = (collection, inCollection, write) => { actions.mutateState(value => write(value, inCollection ? collection.filter(item => item.id !== track.id) : [...collection, track])); if (!inCollection) actions.logQueue(track, node); onClose(); };
  return <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[176px] overflow-hidden rounded-[10px] border border-[var(--wt-border)] bg-[var(--wt-surface)] shadow-[var(--wt-shadow)]"><button onClick={() => toggle(state.dasAscoltare, listenLater, (value, next) => { value.dasAscoltare = next; })} className={`block w-full px-3 py-2 text-left text-xs hover:bg-[var(--wt-hover)] ${listenLater ? 'text-[var(--wt-accent)]' : ''}`}>{listenLater ? '✓ Listen Later' : 'Listen Later'}</button>{state.playlists.map(playlist => { const inPlaylist = playlist.tracks.some(item => item.id === track.id); return <button key={playlist.id} onClick={() => toggle(playlist.tracks, inPlaylist, (_value, next) => { playlist.tracks = next; })} className={`block w-full px-3 py-2 text-left text-xs hover:bg-[var(--wt-hover)] ${inPlaylist ? 'text-[var(--wt-accent)]' : ''}`}>{inPlaylist ? `✓ ${playlist.name}` : playlist.name}</button>; })}<div className="h-px bg-[var(--wt-border)]" /><button onClick={() => { const name = prompt('Playlist name:', ''); if (name?.trim()) { actions.mutateState(value => { value.playlists = [...value.playlists, { id: `pl-${Date.now()}`, name: name.trim(), tracks: [track] }]; }); actions.logQueue(track, node); } onClose(); }} className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--wt-accent)] hover:bg-[var(--wt-hover)]">+ New playlist</button></div>;
}

function RightPanel({ state, actions }) {
  const related = actions.getRelatedView();
  const playing = state.nowPlaying;
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  useEffect(() => { if (playing) actions.syncYtPlayer(); }, [actions, playing?.trackId, playing?.videoId]);
  useEffect(() => { setPlaylistOpen(false); setExploreOpen(false); }, [playing?.trackId]);
  const fullTrack = playing ? actions.findTrack(playing.trackId) : null;
  const context = playing ? actions.findTrackContext(playing.trackId) : null;
  const exploreTargets = playing ? actions.getExploreTargets(playing.trackId, playing.artistName) : [];
  const queued = playing && state.dasAscoltare.some(track => track.id === playing.trackId);
  const playerTrack = playing ? { ...fullTrack, id: playing.trackId, title: playing.title, artistName: playing.artistName, videoId: playing.videoId, thumbUrl: fullTrack?.thumbUrl } : null;
  const fallbackUrl = playing ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${playing.artistName} ${playing.title}`)}` : '';
  const openTarget = target => { actions.addNode(target.type, target.id, target.name, null, state.activeBranchId); setExploreOpen(false); };

  return (
    <aside id="right-panel" className="flex min-h-0 flex-col border-l border-[var(--wt-border)] bg-[var(--wt-surface)] max-[900px]:hidden">
      {!playing ? <div className="px-3 py-[18px] text-center text-xs text-[var(--wt-faint)]">▶&nbsp;&nbsp;Nothing playing</div> : <div className="shrink-0 border-b border-[var(--wt-border)]">
        <div className="px-3 py-2.5"><strong className="block text-[13px]">{playing.title}</strong><span className="mt-0.5 block text-[11px] text-[var(--wt-muted)]">{playing.artistName}</span></div>
        {playing.videoId && !state.ytError ? <div className="aspect-video w-full bg-black"><div id="yt-iframe-host" className="h-full w-full" /></div> : <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-[var(--wt-elevated)] p-4 text-center"><p className="text-xs text-[var(--wt-muted)]">{state.ytError?.message || 'No video in Discogs data'}</p><a className={buttonSecondary} href={state.ytError?.url || fallbackUrl} target="_blank" rel="noreferrer">{state.ytError?.linkText || 'Search on YouTube ↗'}</a></div>}
        <div className="flex items-center gap-1.5 p-2.5">
          <button onClick={() => actions.playAdjacentTrack(-1)} className="flex size-7 items-center justify-center rounded-full border border-[var(--wt-border)] text-[11px]">⏮</button>
          <button onClick={() => actions.playAdjacentTrack(1)} className="flex size-7 items-center justify-center rounded-full border border-[var(--wt-border)] text-[11px]">⏭</button>
          <button onClick={() => actions.toggleLike(playing.trackId)} className={`text-lg ${state.likes[playing.trackId] ? 'text-[#F47B5E]' : 'text-[var(--wt-faint)]'}`}>{state.likes[playing.trackId] ? '♥' : '♡'}</button>
          <div className="relative"><button title="Add to playlist" onClick={() => setPlaylistOpen(value => !value)} className={queued ? 'text-[var(--wt-accent)]' : 'text-[var(--wt-faint)]'}>🏷️</button>{playlistOpen && <PlaylistDrop track={playerTrack} node={context?.node} state={state} actions={actions} onClose={() => setPlaylistOpen(false)} />}</div>
          {exploreTargets.length === 1 && <button onClick={() => openTarget(exploreTargets[0])} className="ml-auto text-[10px] text-[var(--wt-accent)]">Explore</button>}
          {exploreTargets.length > 1 && <div className="relative ml-auto"><button onClick={() => setExploreOpen(value => !value)} className="text-[10px] text-[var(--wt-accent)]">Explore ▾</button>{exploreOpen && <div className="absolute right-0 top-full z-50 min-w-[170px] overflow-hidden rounded-lg border border-[var(--wt-border)] bg-[var(--wt-surface)] shadow-[var(--wt-shadow)]">{exploreTargets.map(target => <button key={`${target.type}-${target.id}`} onClick={() => openTarget(target)} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--wt-hover)]">Explore {target.type}</button>)}</div>}</div>}
          <button onClick={actions.stopPlay} className="flex size-7 items-center justify-center rounded-full bg-[var(--wt-elevated)] text-[var(--wt-muted)]">×</button>
        </div>
      </div>}
      <div className="min-h-0 flex-1 overflow-y-auto p-3"><span className="mb-2 block border-b border-[var(--wt-border)] pb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[var(--wt-faint)]">Related Tracks</span>{related.cards.length ? related.cards.map(card => <RelatedCard key={card.playId} card={card} state={state} actions={actions} />) : <span className="mt-6 block text-center text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--wt-faint)] opacity-50">{related.status}</span>}</div>
    </aside>
  );
}

function RelatedCard({ card, state, actions }) {
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const track = { id: card.playId, title: card.title, artistName: card.artist, videoId: card.videoId, thumbUrl: card.thumbUrl, resolved: card.resolved };
  const prepare = () => actions.registerRelatedTrack(card);
  const liked = !!state.likes[card.playId];
  const queued = state.dasAscoltare.some(item => item.id === card.playId);
  return <div className="relative flex items-center gap-2 rounded-lg p-1.5 hover:bg-[var(--wt-hover)]"><button onClick={() => actions.playRelated(card)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left"><img className="size-10 rounded-md object-cover" src={card.thumbUrl} alt="" /><span className="min-w-0"><strong className="block truncate text-xs">{card.title}</strong><span className="block truncate text-[10px] text-[var(--wt-muted)]">{card.artist}</span></span><span className="ml-auto text-[var(--wt-accent)]">▶</span></button><button onClick={() => { prepare(); actions.toggleLike(card.playId); }} className={liked ? 'text-[#F47B5E]' : 'text-[var(--wt-faint)]'}>{liked ? '♥' : '♡'}</button><div className="relative"><button onClick={() => { prepare(); setPlaylistOpen(value => !value); }} className={queued ? 'text-[var(--wt-accent)]' : 'text-[var(--wt-faint)]'}>🏷️</button>{playlistOpen && <PlaylistDrop track={track} state={state} actions={actions} onClose={() => setPlaylistOpen(false)} />}</div>{card.resolved && <button title={`Explore ${card.resolved.discogsName}`} onClick={() => actions.addNode(card.resolved.type, card.resolved.discogsId, card.resolved.discogsName, null, state.activeBranchId)} className="text-[10px] text-[var(--wt-accent)]">›</button>}</div>;
}

function ModalLayer({ state, session, actions }) {
  if (state.playlistsModal) return <PlaylistsModal state={state} actions={actions} />;
  if (state.likesModal) return <LikesModal state={state} actions={actions} />;
  if (state.historyModal) return <HistoryModal state={state} actions={actions} />;
  if (state.librariesModal) return <LibrariesModal state={state} actions={actions} />;
  if (state.followsModal) return <FollowsModal state={state} actions={actions} />;
  if (state.profileModal) return <ProfileModal state={state} actions={actions} />;
  if (state.settingsModal) return <SettingsModal state={state} session={session} actions={actions} />;
  if (state.heroesModal) return <HeroesModal state={state} actions={actions} />;
  if (state.newReleasesModal) return <NewReleasesModal state={state} actions={actions} />;
  if (state.premiumModal) return <Modal title="Feature coming soon" close={() => actions.mutateState(value => { value.premiumModal = false; })} maxWidth="400px"><div className="text-center"><div className="mb-2 text-4xl">🔒</div><p className="mb-5 text-[13px] leading-5 text-[var(--wt-muted)]">We're still working on this — it'll be available soon. Thanks for testing WaxTree!</p><button className={`${buttonPrimary} w-full py-2.5`} onClick={() => actions.mutateState(value => { value.premiumModal = false; })}>Got it</button></div></Modal>;
  return null;
}

function Modal({ title, close, children, maxWidth = '520px', subtitle }) {
  return <div onClick={close} className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 p-5"><section onClick={event => event.stopPropagation()} style={{ maxWidth }} className="max-h-[84vh] w-full overflow-y-auto rounded-[14px] border border-[var(--wt-border)] bg-[var(--wt-surface)] p-[22px] shadow-[var(--wt-shadow)]"><div className="mb-1 flex items-center justify-between gap-4"><h2 className="text-[15px] font-bold">{title}</h2><button className={buttonSecondary} onClick={close}>×</button></div>{subtitle && <p className="mb-3.5 text-[12.5px] leading-5 text-[var(--wt-muted)]">{subtitle}</p>}{children}</section></div>;
}

function QueueRow({ track, onPlay, onRemove }) {
  return <div className="flex items-center gap-2.5 border-b border-[var(--wt-border)] py-2">{track.thumbUrl ? <img className="size-10 rounded-lg object-cover" src={track.thumbUrl} alt="" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--wt-elevated)]">♫</div>}<div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{track.title}</strong><span className="block truncate text-[11px] text-[var(--wt-muted)]">{[track.artistName, track.year, track.label].filter(Boolean).join(' · ')}</span></div>{track.videoId && <button onClick={onPlay} className="text-[var(--wt-accent)]">▶</button>}<button onClick={onRemove} className="text-base text-[var(--wt-faint)] hover:text-[#F47B5E]">×</button></div>;
}

function PlaylistsModal({ state, actions }) {
  const [name, setName] = useState('');
  const close = () => actions.mutateState(value => { value.playlistsModal = false; });
  return <Modal title="🏷️ Playlists" close={close} subtitle="Create as many playlists as you like — split by genre, by a gig you're digging for, whatever makes sense to you. Rename or delete them anytime."><SectionHeader title="🔖 Listen Later" count={`${state.dasAscoltare.length} tracks`} action={state.dasAscoltare.length ? () => { if (confirm('Clear Listen Later?')) actions.mutateState(value => { value.dasAscoltare = []; }); } : null} />{state.dasAscoltare.length ? state.dasAscoltare.map(track => <QueueRow key={track.id} track={track} onPlay={() => { actions.doPlay(track.id, track.videoId, track.title, track.artistName); close(); }} onRemove={() => actions.mutateState(value => { value.dasAscoltare = value.dasAscoltare.filter(item => item.id !== track.id); })} />) : <p className="py-4 text-center text-xs text-[var(--wt-faint)]">No tracks — use 🏷️ on any track to add</p>}<SectionHeader title="My Playlists" count={`${state.playlists.length} playlists`} /><div className="my-3 flex gap-2"><input value={name} onChange={event => setName(event.target.value)} className={modalInput} placeholder="New playlist name…" /><button onClick={() => { if (!name.trim()) return; actions.mutateState(value => { value.playlists = [...value.playlists, { id: `pl-${Date.now()}`, name: name.trim(), tracks: [] }]; }); setName(''); }} className={buttonPrimary}>Create</button></div>{state.playlists.map(playlist => <div key={playlist.id} className="mb-4"><SectionHeader title={playlist.name} count={`${playlist.tracks.length} tracks`} controls={<><button className={buttonSecondary} onClick={() => { const next = prompt('Playlist name:', playlist.name); if (next?.trim()) actions.mutateState(() => { playlist.name = next.trim(); }); }}>Rename</button><button className={buttonSecondary} onClick={() => { if (confirm(`Delete "${playlist.name}"?`)) actions.mutateState(value => { value.playlists = value.playlists.filter(item => item.id !== playlist.id); }); }}>Delete</button></>} />{playlist.tracks.length ? playlist.tracks.map(track => <QueueRow key={track.id} track={track} onPlay={() => { actions.doPlay(track.id, track.videoId, track.title, track.artistName); close(); }} onRemove={() => actions.mutateState(() => { playlist.tracks = playlist.tracks.filter(item => item.id !== track.id); })} />) : <p className="py-3 text-center text-xs text-[var(--wt-faint)]">No tracks yet</p>}</div>)}</Modal>;
}

function SectionHeader({ title, count, action, controls }) {
  return <div className="mt-3 flex items-center justify-between border-b border-[var(--wt-border)] py-2 text-[11px] font-bold uppercase tracking-[.06em] text-[var(--wt-faint)]"><span>{title}</span><div className="flex items-center gap-2 font-normal normal-case tracking-normal">{count}{action && <button className={buttonSecondary} onClick={action}>Clear</button>}{controls}</div></div>;
}

function LikesModal({ state, actions }) {
  const close = () => actions.mutateState(value => { value.likesModal = false; });
  const tracks = Object.keys(state.likes).filter(id => state.likes[id]).map(id => state.likedTracks[id] || actions.findTrack(id)).filter(Boolean);
  const groups = tracks.reduce((result, track) => { const genres = (track.genre || 'Unknown').split(' · '); genres.forEach(genre => { (result[genre] ||= []).push(track); }); return result; }, {});
  return <Modal title="♥ My Likes" close={close} maxWidth="620px">{tracks.length ? Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([genre, items]) => <div key={genre}><SectionHeader title={`${genre} · ${items.length}`} />{items.map(track => <QueueRow key={`${genre}-${track.id}`} track={track} onPlay={() => { actions.doPlay(track.id, track.videoId, track.title, track.artistName || track.trackArtistName || ''); close(); }} onRemove={() => actions.toggleLike(track.id)} />)}</div>) : <p className="py-8 text-center text-xs text-[var(--wt-faint)]">No liked tracks — use ♡ on tracks to add them</p>}</Modal>;
}

function HistoryModal({ state, actions }) {
  const close = () => actions.mutateState(value => { value.historyModal = false; });
  const openEntry = entry => {
    const existing = state.nodes.find(node => node.discogsId === entry.exploreId || node.name === (entry.exploreName || entry.artistName));
    if (existing) actions.selectNode(existing.id);
    else if (entry.exploreId) actions.addNode(entry.exploreType || 'artist', entry.exploreId, entry.exploreName || entry.artistName, null, state.activeBranchId);
    close();
  };
  return <Modal title="🕓 History" close={close}>{state.history.length ? <><div className="mb-2 flex justify-end"><button className={buttonSecondary} onClick={() => { if (confirm('Clear history?')) actions.mutateState(value => { value.history = []; }); }}>Clear history</button></div>{state.history.map((entry, index) => <div key={`${entry.trackId || entry.id}-${entry.ts || index}`} className="flex items-center gap-3 border-b border-[var(--wt-border)] py-2">{entry.thumbUrl ? <img className="size-10 rounded-lg object-cover" src={entry.thumbUrl} alt="" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--wt-elevated)]">♫</div>}<div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{entry.title}</strong><span className="text-[11px] text-[var(--wt-muted)]">{[entry.artistName, entry.ts ? new Date(entry.ts).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''].filter(Boolean).join(' · ')}</span></div>{entry.videoId && <button onClick={() => { actions.doPlay(entry.id, entry.videoId, entry.title, entry.artistName); close(); }} className="text-[var(--wt-accent)]">▶</button>}<button className={buttonSecondary} onClick={() => openEntry(entry)}>Open</button></div>)}</> : <p className="py-8 text-center text-xs text-[var(--wt-faint)]">No tracks yet — listen to something for 3 seconds</p>}</Modal>;
}

function ProfileModal({ state, actions }) {
  const close = () => actions.mutateState(value => { value.profileModal = false; });
  const level = actions.getLevelFromCount(state.searchCount);
  const progress = actions.getProgressToNext(state.searchCount);
  return <Modal title="🌲 My Profile" close={close}><div className="border-b border-[var(--wt-border)] py-4 text-center"><strong className="block text-xl">{level.title}</strong><span className="mt-1 block text-[13px] text-[var(--wt-muted)]">{level.tagline}</span></div>{level.level < 15 && <><div className="mt-3.5 h-1.5 overflow-hidden rounded bg-[var(--wt-elevated)]"><div style={{ width: `${progress}%` }} className="h-full rounded bg-[var(--wt-accent)]" /></div><p className="mt-1 text-[11px] text-[var(--wt-muted)]">{progress}% to next level</p></>}<div className="mt-4 flex flex-col gap-1.5">{Array.from({ length: 15 }, (_, index) => index + 1).map(number => { const item = actions.getLevelFromCount(number === 15 ? 10001 : [0, 21, 61, 121, 201, 351, 501, 751, 1001, 1501, 2001, 3001, 4501, 6501, 10001][number - 1]); const unlocked = state.searchCount >= item.min; return <div key={number} className={`flex gap-2.5 rounded-[10px] border p-2.5 ${item.level === level.level ? 'border-[var(--wt-accent)] bg-[var(--wt-hover)]' : 'border-transparent bg-[var(--wt-elevated)]'} ${unlocked ? '' : 'opacity-30'}`}><span className="w-[18px] text-[11px] text-[var(--wt-faint)]">{number}</span><div><strong className="block text-[13px]">{item.title}</strong>{unlocked && <span className="text-[11px] text-[var(--wt-muted)]">{item.tagline}</span>}</div></div>; })}</div></Modal>;
}

function FollowsModal({ state, actions }) {
  const close = () => actions.mutateState(value => { value.followsModal = false; });
  return <Modal title="Following" close={close}>{state.follows.length ? state.follows.map(follow => <div key={`${follow.type}-${follow.discogs_id}`} className="flex items-center gap-2.5 border-b border-[var(--wt-border)] py-2">{follow.image_url ? <img className="size-10 rounded-lg object-cover" src={follow.image_url} alt="" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--wt-elevated)]">{follow.type === 'label' ? '◎' : '♙'}</div>}<strong className="min-w-0 flex-1 truncate text-[13px]">{follow.name}</strong><button className={buttonSecondary} onClick={() => { const existing = state.nodes.find(node => node.discogsId === follow.discogs_id && node.branchId === state.activeBranchId); if (existing) actions.selectNode(existing.id); else actions.addNode(follow.type, follow.discogs_id, follow.name, null, state.activeBranchId); close(); }}>Open ›</button><button className="text-[#F47B5E]" onClick={() => actions.toggleFollow({ discogsId: follow.discogs_id, type: follow.type, name: follow.name })}>×</button></div>) : <p className="py-8 text-center text-xs text-[var(--wt-faint)]">No followed artists or labels yet</p>}</Modal>;
}

function LibrariesModal({ state, actions }) {
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
        {tabs.map(([key, label, count]) => <button key={key} onClick={() => actions.mutateState(value => { value.librariesTab = key; })} className={`flex-1 rounded-[10px] border-[1.5px] p-2.5 text-[13px] font-semibold ${state.librariesTab === key ? 'border-[var(--wt-accent)] bg-[var(--wt-accent)]/10 text-[var(--wt-accent)]' : 'border-[var(--wt-border)] bg-[var(--wt-elevated)] text-[var(--wt-muted)]'}`}>{label}{count !== '' ? ` (${count})` : ''}</button>)}
      </div>

      {state.librariesTab === 'sync' ? (
        <div className="py-3">
          {state.welcomeSyncIntro && <div className="mb-4 rounded-lg bg-[var(--wt-accent)]/10 p-3"><strong className="block text-[13px]">Welcome to WaxTree!</strong><p className="mt-1 text-[12px] leading-5 text-[var(--wt-muted)]">Add your music by linking your local folder and connecting your Discogs account below. Matching tracks will be tagged while you dig.</p></div>}
          <p className="mb-4 text-[12px] text-[var(--wt-muted)]">Connect your music sources — matching tracks get tagged while you dig.</p>

          <SectionHeader title="💾 Local Music Folder" />
          <div className="flex flex-wrap items-center gap-2 py-3">
            <div className="min-w-[180px] flex-1"><strong className="block text-[13px]">Music folder</strong><span className="text-[11px] text-[var(--wt-muted)]">{state.ownedTracks.length ? `${state.ownedTracks.length} tracks indexed` : 'No folder linked yet'}</span></div>
            <button onClick={scanFolder} className={buttonSecondary}>{state.ownedTracks.length ? 'Rescan' : 'Link folder'}</button>
            {state.ownedTracks.length > 0 && <button disabled={state.libraryMatchRunning} onClick={actions.matchLibraryWithDiscogs} className={buttonSecondary}>{state.libraryMatchRunning ? `${state.libraryMatchProgress.done}/${state.libraryMatchProgress.total}` : 'Match library'}</button>}
            {scanStatus && <p className="basis-full text-[11px] text-[var(--wt-muted)]">{scanStatus}</p>}
          </div>

          <SectionHeader title="🎵 Discogs Collection" />
          {!state.discogsUser ? <div className="py-3"><p className="mb-3 text-[12px] text-[var(--wt-muted)]">Connect your Discogs account to sync your collection and wantlist.</p><button onClick={async () => { try { await actions.connectDiscogs(); } catch (error) { alert(`Discogs connection failed: ${error.message}`); } }} className="w-full rounded-xl border-[1.5px] border-[#555] bg-[#333] px-4 py-2.5 text-[13px] font-semibold text-white">Connect with Discogs</button></div> : <div className="py-3"><div className="mb-3 rounded-lg bg-[var(--wt-elevated)] p-3 text-[12px] text-[var(--wt-muted)]"><strong className="block text-[var(--wt-text)]">Connected as @{state.discogsUser}</strong>{state.discogsCollSyncedAt && <span>Last synced: {new Date(state.discogsCollSyncedAt).toLocaleString()} · {state.discogsCollection.length} releases · {state.discogsWantlist.length} wanted</span>}</div><button disabled={state.discogsSyncing} onClick={async () => { try { await actions.syncDiscogsAccount(); } catch (error) { alert(`Sync failed: ${error.message}`); } }} className={`${buttonPrimary} w-full py-2.5 disabled:opacity-50`}>{state.discogsSyncing ? 'Syncing…' : 'Sync now'}</button><button onClick={() => actions.mutateState(value => { value.heroesModal = true; value.librariesModal = false; })} className={`${buttonSecondary} mt-2 w-full`}>🌲 Follow Your Heroes</button><button onClick={() => { if (confirm('Disconnect Discogs account?')) actions.disconnectDiscogs(); }} className={`${buttonSecondary} mt-2 w-full`}>Disconnect Discogs account</button></div>}
        </div>
      ) : (
        <>
          <input value={state.librariesSearch} onChange={event => actions.mutateState(value => { value.librariesSearch = event.target.value; })} className={`${modalInput} my-3`} placeholder="Search artist, release or label…" />
          <div className="max-h-[420px] overflow-y-auto">
            {filtered.length ? filtered.map((release, index) => <div key={release.discogsUrl || `${release.title}-${index}`} className="flex items-center gap-2.5 border-b border-[var(--wt-border)] py-2">{release.thumb ? <img className="size-10 rounded-lg object-cover" src={release.thumb} alt="" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--wt-elevated)]">♫</div>}<div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{release.title}</strong><span className="block truncate text-[11px] text-[var(--wt-muted)]">{[release.artist, release.year, release.labelExploreName].filter(Boolean).join(' · ')}</span>{release.genres?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{release.genres.map(genre => <span key={genre} className="rounded border border-[var(--wt-accent)]/30 px-1.5 text-[9px] text-[var(--wt-accent)]">{genre}</span>)}</div>}</div>{release.artistExploreId && <button className={buttonSecondary} onClick={() => openEntity(release.artistExploreType || 'artist', release.artistExploreId, release.artistExploreName)}>Artist ↗</button>}{release.labelExploreId && <button className={buttonSecondary} onClick={() => openEntity('label', release.labelExploreId, release.labelExploreName)}>Label ↗</button>}</div>) : <button onClick={() => { if (!source.length) actions.mutateState(value => { value.librariesTab = 'sync'; }); }} className="w-full py-8 text-center text-xs text-[var(--wt-faint)]">{source.length ? `No matches for "${state.librariesSearch.trim()}".` : state.librariesTab === 'vinyl' ? 'Sync your Discogs collection to see it here.' : state.ownedTracks.length ? 'No matches yet — explore an artist or label whose tracks are in your local folder.' : 'Link your local music folder to see it here.'}</button>}
          </div>
        </>
      )}
    </Modal>
  );
}

function SettingsModal({ state, session, actions }) {
  const close = () => actions.mutateState(value => { value.settingsModal = false; });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const avatar = actions.getAvatarUrl();
  const changePassword = async () => { if (password.length < 8) return setMessage('Minimum 8 characters.'); if (password !== confirmPassword) return setMessage('Passwords do not match.'); const { error } = await actions.supabase.auth.updateUser({ password }); setMessage(error ? error.message : 'Password updated successfully.'); if (!error) { setPassword(''); setConfirmPassword(''); } };
  return <Modal title="⚙ My Settings" close={close}><SectionHeader title="Account" /><div className="flex items-center justify-between py-3"><div><strong className="block text-[13px]">Email</strong><span className="text-[11px] text-[var(--wt-muted)]">{session?.user?.email}</span></div></div><div className="flex items-center gap-3 border-t border-[var(--wt-border)] py-3">{avatar ? <img className="size-12 rounded-full object-cover" src={avatar} alt="" /> : <div className="flex size-12 items-center justify-center rounded-full bg-[var(--wt-elevated)]">👤</div>}<div className="min-w-0 flex-1"><strong className="block text-[13px]">Profile photo</strong><span className="text-[11px] text-[var(--wt-muted)]">{avatar ? 'Linked to your account' : 'No photo yet'}</span></div><label className={`${buttonSecondary} cursor-pointer`}>{uploading ? 'Uploading…' : avatar ? 'Change photo' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); try { await actions.uploadAvatar(file); } catch (error) { alert(error.message); } setUploading(false); }} /></label></div><div className="border-t border-[var(--wt-border)] py-3"><div className="flex items-center justify-between"><div><strong className="block text-[13px]">Password</strong><span className="text-[11px] text-[var(--wt-muted)]">Set a new password for your account</span></div><button className={buttonSecondary} onClick={() => setPasswordOpen(value => !value)}>{passwordOpen ? 'Cancel' : 'Change'}</button></div>{passwordOpen && <div className="mt-3"><input className={`${modalInput} mb-2`} value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="New password (min. 8 chars)" /><input className={modalInput} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} type="password" placeholder="Confirm new password" /><p className="my-2 text-xs text-[var(--wt-muted)]">{message}</p><div className="text-right"><button className={buttonPrimary} onClick={changePassword}>Save password</button></div></div>}</div><SectionHeader title="Data" /><div className="flex items-center justify-between py-3"><div><strong className="block text-[13px]">Listen history</strong><span className="text-[11px] text-[var(--wt-muted)]">{state.history.length} tracks listened</span></div><button className={buttonSecondary} onClick={() => { if (confirm('Clear listen history?')) actions.mutateState(value => { value.history = []; value.listens = {}; }); }}>Clear</button></div><div className="flex items-center justify-between border-t border-[var(--wt-border)] py-3"><div><strong className="block text-[13px] text-[#F47B5E]">⚠ Delete account</strong><span className="text-[11px] text-[var(--wt-muted)]">Permanently delete your account and all data</span></div><button className="rounded-full border border-[#F47B5E] px-3.5 py-1.5 text-xs text-[#F47B5E]" onClick={async () => { if (prompt('Type DELETE to confirm:') !== 'DELETE') return; const { data: { session: activeSession } } = await actions.supabase.auth.getSession(); const response = await fetch('/api/delete-account', { method: 'POST', headers: { Authorization: `Bearer ${activeSession.access_token}` } }); if (!response.ok) return alert('Failed to delete account'); await actions.supabase.auth.signOut(); window.location.href = '/login'; }}>Delete</button></div></Modal>;
}

function HeroesModal({ state, actions }) {
  const close = () => actions.mutateState(value => { value.heroesModal = false; });
  const heroes = actions.computeDiggingHeroes(true);
  return <Modal title="🌲 Follow Your Heroes" close={close} maxWidth="640px" subtitle="We looked through your collection, wantlist and local library — these are the artists and labels you keep coming back to.">{[['Artists you dig', heroes.artists, 'artist'], ['Labels you dig', heroes.labels, 'label']].map(([title, items, type]) => items.length > 0 && <div key={type}><SectionHeader title={title} />{items.map(item => { const followed = state.follows.some(follow => follow.discogs_id === item.id && follow.type === type); return <div key={item.id} className="flex items-center gap-3 border-b border-[var(--wt-border)] py-2">{item.thumb ? <img className="size-11 rounded-lg object-cover" src={item.thumb} alt="" /> : <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--wt-elevated)]">{type === 'label' ? '🏷️' : '🎤'}</div>}<div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{item.name}</strong><span className="text-[11px] text-[var(--wt-muted)]">{item.collectionCount || 0} releases · {item.libraryCount || 0} library tracks</span></div><button className={buttonSecondary} onClick={() => actions.toggleFollow({ discogsId: item.id, type, name: item.name, data: { imageUrl: item.thumb } })}>{followed ? '✓ Following' : '+ Follow'}</button><button className={buttonSecondary} onClick={() => { actions.addNode(type, item.id, item.name, null, state.activeBranchId); close(); }}>Open ›</button></div>; })}</div>)}</Modal>;
}

function NewReleasesModal({ state, actions }) {
  const close = () => actions.mutateState(value => { value.newReleasesModal = false; });
  return <Modal title="New releases" close={close}>{state.newReleasesFound.length ? state.newReleasesFound.map((release, index) => <NewReleaseRow key={`${release.followType}-${release.followDiscogsId}-${release.track?.id || index}`} release={release} state={state} actions={actions} close={close} />) : <p className="py-8 text-center text-xs text-[var(--wt-faint)]">No new releases</p>}</Modal>;
}

function NewReleaseRow({ release, state, actions, close }) {
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const track = release.track;
  if (!track) return null;
  const artistName = track.trackArtistName || release.followName;
  const queuedTrack = { ...track, artistName };
  const liked = !!state.likes[track.id];
  const queued = state.dasAscoltare.some(item => item.id === track.id);
  return <div className="relative flex items-center gap-3 border-b border-[var(--wt-border)] py-2">{track.thumbUrl ? <img className="size-11 rounded-lg object-cover" src={track.thumbUrl} alt="" /> : <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--wt-elevated)]">💿</div>}<div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{release.releaseTitle || track.album || track.title}</strong><span className="text-[11px] text-[var(--wt-muted)]">New from {release.followName}{track.year ? ` · ${track.year}` : ''}</span></div>{track.videoId && <button onClick={() => { actions.doPlay(track.id, track.videoId, track.title, artistName); close(); }} className="text-[var(--wt-accent)]">▶</button>}<button onClick={() => actions.toggleLike(track.id)} className={liked ? 'text-[#F47B5E]' : 'text-[var(--wt-faint)]'}>{liked ? '♥' : '♡'}</button><div className="relative"><button onClick={() => setPlaylistOpen(value => !value)} className={queued ? 'text-[var(--wt-accent)]' : 'text-[var(--wt-faint)]'}>🏷️</button>{playlistOpen && <PlaylistDrop track={queuedTrack} state={state} actions={actions} onClose={() => setPlaylistOpen(false)} />}</div><button className={buttonSecondary} onClick={() => { actions.addNode(release.followType, release.followDiscogsId, release.followName, null, state.activeBranchId); close(); }}>Explore ›</button></div>;
}

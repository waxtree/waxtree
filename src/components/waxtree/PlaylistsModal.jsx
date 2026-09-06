import { useState } from 'react';
import { Modal } from '@/components/waxtree/Modal';
import { QueueRow } from '@/components/waxtree/QueueRow';
import { buttonPrimary, buttonSecondary, modalInput } from '@/lib/waxtreeUi';

const LISTEN_LATER_ID = '__listen_later__';

export const PlaylistsModal = ({ state, actions }) => {
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState(LISTEN_LATER_ID);
  const close = () => actions.mutateState(value => { value.playlistsModal = false; });

  // Listen Later is a playlist for this modal's purposes too — same
  // sidebar list, same track list, just built-in (no rename/delete) and
  // backed by dasAscoltare instead of one of state.playlists' own entries.
  const tabs = [{ id: LISTEN_LATER_ID, name: '🔖 Listen Later', tracks: state.dasAscoltare, builtIn: true }, ...state.playlists];
  const selected = tabs.find(item => item.id === selectedId) || tabs[0];

  const createPlaylist = () => {
    if (!name.trim()) return;
    const playlist = { id: `pl-${Date.now()}`, name: name.trim(), tracks: [] };
    actions.mutateState(value => { value.playlists = [...value.playlists, playlist]; });
    setSelectedId(playlist.id);
    setName('');
  };

  const deletePlaylist = playlist => {
    if (!confirm(`Delete "${playlist.name}"?`)) return;
    actions.mutateState(value => { value.playlists = value.playlists.filter(item => item.id !== playlist.id); });
    if (selectedId === playlist.id) setSelectedId(LISTEN_LATER_ID);
  };

  const renamePlaylist = playlist => {
    const next = prompt('Playlist name:', playlist.name);
    if (next?.trim()) actions.mutateState(() => { playlist.name = next.trim(); });
  };

  const removeFromSelected = track => {
    if (selected.builtIn) actions.mutateState(value => { value.dasAscoltare = value.dasAscoltare.filter(item => item.id !== track.id); });
    else actions.mutateState(() => { selected.tracks = selected.tracks.filter(item => item.id !== track.id); });
  };

  return (
    <Modal title="🏷️ Playlists" close={close} maxWidth="760px" subtitle="Create as many playlists as you like — split by genre, by a gig you're digging for, whatever makes sense to you.">
      <div className="my-3 flex gap-2">
        <input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') createPlaylist(); }} className={modalInput} placeholder="New playlist name…" />
        <button type="button" onClick={createPlaylist} className={buttonPrimary}>Create</button>
      </div>

      {/* Side-by-side, same shape as the main app's own node sidebar
          (SidebarNode) — a vertical, scrollable list of playlist names on
          the left (active one left-border-accented, same convention),
          the selected playlist's tracks filling the rest. Replaced the
          old horizontal tab strip: with more than a handful of playlists
          that row just ran out of width and hid the rest off-screen with
          no visual hint they existed. */}
      <div className="flex gap-3 max-sm:flex-col">
        <div className="max-h-[56vh] w-[190px] shrink-0 overflow-y-auto rounded-[10px] border border-border py-1 max-sm:max-h-36 max-sm:w-full">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setSelectedId(tab.id)}
              onDoubleClick={() => { if (!tab.builtIn) renamePlaylist(tab); }}
              title={tab.builtIn ? undefined : 'Double-click to rename'}
              className={`group flex cursor-pointer items-center gap-1.5 border-l-2 py-[7px] pl-2.5 pr-2 ${selected?.id === tab.id ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}`}
            >
              <span className={`min-w-0 flex-1 truncate text-[12.5px] ${selected?.id === tab.id ? 'font-semibold text-primary' : ''}`}>{tab.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground/70">{tab.tracks.length}</span>
              {!tab.builtIn && (
                <button type="button" title="Delete playlist" onClick={event => { event.stopPropagation(); deletePlaylist(tab); }} className="shrink-0 text-muted-foreground/70 opacity-0 hover:text-destructive group-hover:opacity-100">×</button>
              )}
            </div>
          ))}
        </div>

        <div className="max-h-[56vh] min-w-0 flex-1 overflow-y-auto">
          {selected.builtIn && selected.tracks.length > 0 && (
            <div className="flex justify-end pb-2">
              <button type="button" className={buttonSecondary} onClick={() => { if (confirm('Clear Listen Later?')) actions.mutateState(value => { value.dasAscoltare = []; }); }}>Clear</button>
            </div>
          )}
          {selected.tracks.length ? selected.tracks.map(track => (
            <QueueRow
              key={track.id}
              track={track}
              state={state}
              actions={actions}
              showMove
              // Deliberately does NOT close() — pressing play used to
              // kick the user straight back out to the tree behind this
              // modal, which made browsing several tracks from a playlist
              // in a row (the exact point of this modal) impossible.
              // doPlay() itself still reaches the real mini-player fine
              // even while this sits on top of it (RightPanel's iframe/
              // audio element stays mounted, just visually behind this
              // overlay) — the user can close this whenever they actually
              // want to see the transport controls.
              onPlay={() => actions.doPlay(track.id, track.videoId, track.title, track.artistName)}
              onRemove={() => removeFromSelected(track)}
            />
          )) : <p className="py-8 text-center text-xs text-muted-foreground/70">No tracks yet — use 🏷️ on any track to add</p>}
        </div>
      </div>
    </Modal>
  );
};

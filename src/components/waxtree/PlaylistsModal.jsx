import { useState } from 'react';
import { Modal } from '@/components/waxtree/Modal';
import { QueueRow } from '@/components/waxtree/QueueRow';
import { buttonPrimary, buttonSecondary, hScrollThin, modalInput } from '@/lib/waxtreeUi';

const LISTEN_LATER_ID = '__listen_later__';

export const PlaylistsModal = ({ state, actions }) => {
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState(LISTEN_LATER_ID);
  const close = () => actions.mutateState(value => { value.playlistsModal = false; });

  // Listen Later is a playlist for this modal's purposes too — same tab
  // strip, same track list, just built-in (no rename/delete) and backed by
  // dasAscoltare instead of one of state.playlists' own entries.
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
    <Modal title="🏷️ Playlists" close={close} subtitle="Create as many playlists as you like — split by genre, by a gig you're digging for, whatever makes sense to you.">
      <div className="my-3 flex gap-2">
        <input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') createPlaylist(); }} className={modalInput} placeholder="New playlist name…" />
        <button type="button" onClick={createPlaylist} className={buttonPrimary}>Create</button>
      </div>

      <div className={`flex items-end gap-0.5 border-b border-border ${hScrollThin}`}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setSelectedId(tab.id)}
            onDoubleClick={() => { if (!tab.builtIn) renamePlaylist(tab); }}
            title={tab.builtIn ? undefined : 'Double-click to rename'}
            className={`relative -bottom-px flex shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-[11px] font-semibold ${selected?.id === tab.id ? 'border-border bg-card text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >
            <span className="max-w-32 truncate">{tab.name}</span>
            <span className="text-[10px] font-normal opacity-60">{tab.tracks.length}</span>
            {!tab.builtIn && (
              <button type="button" title="Delete playlist" onClick={event => { event.stopPropagation(); deletePlaylist(tab); }} className="text-muted-foreground/70 hover:text-destructive">×</button>
            )}
          </div>
        ))}
      </div>

      {selected.builtIn && selected.tracks.length > 0 && (
        <div className="flex justify-end py-2">
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
          onPlay={() => { actions.doPlay(track.id, track.videoId, track.title, track.artistName); close(); }}
          onRemove={() => removeFromSelected(track)}
        />
      )) : <p className="py-8 text-center text-xs text-muted-foreground/70">No tracks yet — use 🏷️ on any track to add</p>}
    </Modal>
  );
};

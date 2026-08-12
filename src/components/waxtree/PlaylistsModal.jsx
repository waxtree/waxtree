import { useState } from 'react';
import { Modal } from '@/components/waxtree/Modal';
import { QueueRow } from '@/components/waxtree/QueueRow';
import { SectionHeader } from '@/components/waxtree/SectionHeader';
import { buttonPrimary, modalInput } from '@/lib/waxtreeUi';

export const PlaylistsModal = ({ state, actions }) => {
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState(state.playlists[0]?.id || null);
  const close = () => actions.mutateState(value => { value.playlistsModal = false; });
  const selected = state.playlists.find(item => item.id === selectedId) || state.playlists[0] || null;

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
    if (selectedId === playlist.id) setSelectedId(null);
  };

  const renamePlaylist = playlist => {
    const next = prompt('Playlist name:', playlist.name);
    if (next?.trim()) actions.mutateState(() => { playlist.name = next.trim(); });
  };

  return (
    <Modal title="🏷️ Playlists" close={close} subtitle="Create as many playlists as you like — split by genre, by a gig you're digging for, whatever makes sense to you.">
      <SectionHeader title="🔖 Listen Later" count={`${state.dasAscoltare.length} tracks`} action={state.dasAscoltare.length ? () => { if (confirm('Clear Listen Later?')) actions.mutateState(value => { value.dasAscoltare = []; }); } : null} />
      {state.dasAscoltare.length ? state.dasAscoltare.map(track => (
        <QueueRow
          key={track.id}
          track={track}
          state={state}
          actions={actions}
          showMove
          onPlay={() => { actions.doPlay(track.id, track.videoId, track.title, track.artistName); close(); }}
          onRemove={() => actions.mutateState(value => { value.dasAscoltare = value.dasAscoltare.filter(item => item.id !== track.id); })}
        />
      )) : <p className="py-4 text-center text-xs text-muted-foreground/70">No tracks — use 🏷️ on any track to add</p>}

      <SectionHeader title="My Playlists" count={`${state.playlists.length} playlists`} />
      <div className="my-3 flex gap-2">
        <input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') createPlaylist(); }} className={modalInput} placeholder="New playlist name…" />
        <button type="button" onClick={createPlaylist} className={buttonPrimary}>Create</button>
      </div>

      {!state.playlists.length ? (
        <p className="py-8 text-center text-xs text-muted-foreground/70">No playlists yet — create one above</p>
      ) : (
        <>
          <div className="flex items-end gap-0.5 overflow-x-auto border-b border-border">
            {state.playlists.map(playlist => (
              <div
                key={playlist.id}
                onClick={() => setSelectedId(playlist.id)}
                onDoubleClick={() => renamePlaylist(playlist)}
                title="Double-click to rename"
                className={`relative -bottom-px flex shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-[11px] font-semibold ${selected?.id === playlist.id ? 'border-border bg-card text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
              >
                <span className="max-w-32 truncate">{playlist.name}</span>
                <span className="text-[10px] font-normal opacity-60">{playlist.tracks.length}</span>
                <button type="button" title="Delete playlist" onClick={event => { event.stopPropagation(); deletePlaylist(playlist); }} className="text-muted-foreground/70 hover:text-destructive">×</button>
              </div>
            ))}
          </div>
          {selected && (selected.tracks.length ? selected.tracks.map(track => (
            <QueueRow
              key={track.id}
              track={track}
              state={state}
              actions={actions}
              showMove
              onPlay={() => { actions.doPlay(track.id, track.videoId, track.title, track.artistName); close(); }}
              onRemove={() => actions.mutateState(() => { selected.tracks = selected.tracks.filter(item => item.id !== track.id); })}
            />
          )) : <p className="py-4 text-center text-xs text-muted-foreground/70">No tracks yet — use 🏷️ on any track to add</p>)}
        </>
      )}
    </Modal>
  );
};

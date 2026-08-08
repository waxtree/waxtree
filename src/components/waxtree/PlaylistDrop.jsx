export const PlaylistDrop = ({ track, node, state, actions, onClose }) => {
  const listenLater = state.dasAscoltare.some(item => item.id === track.id);
  const toggle = (collection, inCollection, write) => {
    actions.mutateState(value => write(value, inCollection ? collection.filter(item => item.id !== track.id) : [...collection, track]));
    if (!inCollection) actions.logQueue(track, node);
    onClose();
  };

  return (
    <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[176px] overflow-hidden rounded-[10px] border border-border bg-card shadow-[var(--wt-shadow)]">
      <button type="button" onClick={() => toggle(state.dasAscoltare, listenLater, (value, next) => { value.dasAscoltare = next; })} className={`block w-full px-3 py-2 text-left text-xs hover:bg-muted ${listenLater ? 'text-primary' : ''}`}>
        {listenLater ? '✓ Listen Later' : 'Listen Later'}
      </button>
      {state.playlists.map(playlist => {
        const inPlaylist = playlist.tracks.some(item => item.id === track.id);
        return (
          <button key={playlist.id} type="button" onClick={() => toggle(playlist.tracks, inPlaylist, (_value, next) => { playlist.tracks = next; })} className={`block w-full px-3 py-2 text-left text-xs hover:bg-muted ${inPlaylist ? 'text-primary' : ''}`}>
            {inPlaylist ? `✓ ${playlist.name}` : playlist.name}
          </button>
        );
      })}
      <div className="h-px bg-border" />
      <button
        type="button"
        onClick={() => {
          const name = prompt('Playlist name:', '');
          if (name?.trim()) {
            actions.mutateState(value => { value.playlists = [...value.playlists, { id: `pl-${Date.now()}`, name: name.trim(), tracks: [track] }]; });
            actions.logQueue(track, node);
          }
          onClose();
        }}
        className="block w-full px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-muted"
      >
        + New playlist
      </button>
    </div>
  );
};

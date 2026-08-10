import { ChevronRight, Heart, Play, Tag } from 'lucide-react';
import { useState } from 'react';
import { PlaylistDrop } from '@/components/waxtree/PlaylistDrop';

export const RelatedCard = ({ card, state, actions }) => {
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const track = { id: card.playId, title: card.title, artistName: card.artist, videoId: card.videoId, thumbUrl: card.thumbUrl, resolved: card.resolved };
  const prepare = () => actions.registerRelatedTrack(card);
  const liked = !!state.likes[card.playId];
  const queued = state.dasAscoltare.some(item => item.id === card.playId);

  return (
    <div className="relative flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted">
      <button type="button" onClick={() => actions.playRelated(card)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <img className="size-10 rounded-md object-cover" src={card.thumbUrl} alt="" />
        <span className="min-w-0">
          <strong className="block truncate text-xs">{card.title}</strong>
          <span className="block truncate text-[10px] text-muted-foreground">{card.artist}</span>
        </span>
        <Play className="ml-auto size-3.5 shrink-0 fill-primary text-primary" />
      </button>
      <button type="button" title="Like" onClick={() => { prepare(); actions.toggleLike(card.playId); }} className={`flex items-center justify-center ${liked ? 'text-primary' : 'text-muted-foreground/70'}`}>
        <Heart className={`size-3.5 ${liked ? 'fill-current' : ''}`} />
      </button>
      <div className="relative flex items-center">
        <button type="button" title="Add to playlist" onClick={() => { prepare(); setPlaylistOpen(value => !value); }} className={`flex items-center justify-center ${queued ? 'text-primary' : 'text-muted-foreground/70'}`}>
          <Tag className="size-3.5" />
        </button>
        {playlistOpen && <PlaylistDrop track={track} state={state} actions={actions} onClose={() => setPlaylistOpen(false)} />}
      </div>
      {card.resolved && (
        <button type="button" title={`Explore ${card.resolved.discogsName}`} onClick={() => actions.addNode(card.resolved.type, card.resolved.discogsId, card.resolved.discogsName, null, state.activeBranchId)} className="flex items-center justify-center text-primary">
          <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  );
};

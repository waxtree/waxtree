import { RelatedCard } from '@/components/waxtree/RelatedCard';

export const YoutubeExtrasSection = ({ node, state, actions }) => {
  const extras = actions.getYtExtras(node.id);
  if (!extras?.tracks.length) return null;

  return (
    <div className="mt-5">
      <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">MORE FROM YOUTUBE</p>
      <p className="mb-2 mt-0.5 text-[10.5px] text-muted-foreground/60">On their channel, not on Discogs yet.</p>
      <div className="flex flex-col gap-[2px]">
        {extras.tracks.map(card => <RelatedCard key={card.playId} card={card} state={state} actions={actions} />)}
      </div>
    </div>
  );
};

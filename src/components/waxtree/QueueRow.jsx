import { BuyMenu } from '@/components/waxtree/BuyMenu';

export const QueueRow = ({ track, actions, onPlay, onRemove }) => (
  <div className="flex items-center gap-2.5 border-b border-border py-2">
    {track.thumbUrl ? <img className="size-10 rounded-lg object-cover" src={track.thumbUrl} alt="" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">♫</div>}
    <div className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{track.title}</strong><span className="block truncate text-[11px] text-muted-foreground">{[track.artistName, track.year, track.label].filter(Boolean).join(' · ')}</span></div>
    {track.videoId && <button type="button" onClick={onPlay} className="text-primary">▶</button>}
    <BuyMenu track={track} actions={actions} />
    <button type="button" onClick={onRemove} className="text-base text-muted-foreground/70 hover:text-destructive">×</button>
  </div>
);

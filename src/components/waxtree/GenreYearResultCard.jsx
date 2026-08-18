import { ArrowUpRight, Play } from 'lucide-react';
import { useState } from 'react';

export const GenreYearResultCard = ({ release, actions }) => {
  const [playing, setPlaying] = useState(false);
  const tags = release.styles?.length ? release.styles : [release.genre].filter(Boolean);

  const playFirst = async event => {
    event.stopPropagation();
    if (playing) return;
    setPlaying(true);
    try {
      await actions.playFirstTrackOfRelease(release.id);
    } catch (error) {
      alert(error.message);
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div onClick={() => actions.pickResult(release)} className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-border bg-card p-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]">
      {release.thumb ? <img className="size-12 shrink-0 rounded-[6px] border border-border object-cover" src={release.thumb} alt="" loading="lazy" /> : <div className="flex size-12 shrink-0 items-center justify-center rounded-[6px] border border-border bg-secondary text-[17px] text-muted-foreground/70">♫</div>}
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-[13px]">{release.title}</strong>
        <span className="block truncate text-[11px] text-muted-foreground">{[release.label, release.year].filter(Boolean).join(' · ')}</span>
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map(tag => <span key={tag} className="inline-block rounded-full border border-primary/30 px-1.5 py-px text-[10px] text-primary">{tag}</span>)}
          </div>
        )}
      </div>
      <button type="button" title="Play first track" onClick={playFirst} className="shrink-0 text-muted-foreground/70 hover:text-primary disabled:opacity-50" disabled={playing}>
        {playing ? <span className="block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Play className="size-3.5" />}
      </button>
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/70" />
    </div>
  );
};

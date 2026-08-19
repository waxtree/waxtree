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
    <div onClick={() => actions.pickResult(release)} className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-1.5 transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]">
      {release.thumb ? <img className="size-9 shrink-0 rounded-[6px] border border-border object-cover" src={release.thumb} alt="" loading="lazy" /> : <div className="flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-border bg-secondary text-muted-foreground/70">♫</div>}
      <button
        type="button"
        title="Play first track"
        onClick={playFirst}
        disabled={playing}
        className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        {playing ? <span className="block size-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Play className="size-2.5 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-[12.5px]">{release.title}</strong>
        <span className="block truncate text-[11px] text-muted-foreground">{[release.label, release.year].filter(Boolean).join(' · ')}</span>
      </div>
      {tags.length > 0 && (
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          {tags.slice(0, 3).map(tag => <span key={tag} className="whitespace-nowrap rounded-full border border-primary/30 px-1.5 py-px text-[10px] text-primary">{tag}</span>)}
        </div>
      )}
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/70" />
    </div>
  );
};

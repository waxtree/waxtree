import { useEffect, useRef, useState } from 'react';
import { GenrePill } from '@/components/onboarding/GenrePill';
import { StepHeading } from '@/components/onboarding/StepHeading';
import { MIN_GENRES } from '@/lib/onboardingContent';

const MAX_SUGGESTED = 8;

export const StepGenres = ({ state, actions }) => {
  // null while the picks are still being read; [] when nothing could be.
  const [ranked, setRanked] = useState(null);
  const savedSignals = useRef(false);
  const selected = state.onboarding.genres;

  useEffect(() => {
    let active = true;
    actions.getGenreSuggestions(state.favoriteArtists, state.favoriteLabels)
      .then(({ suggestions, signals }) => {
        if (!active) return;
        setRanked(suggestions);
        if (!savedSignals.current && Object.keys(signals).length) {
          savedSignals.current = true;
          actions.updateOnboarding({ signals });
        }
      })
      .catch(() => { if (active) setRanked([]); });
    return () => { active = false; };
  }, [actions]);

  const suggested = (ranked || []).slice(0, MAX_SUGGESTED).map(item => item.style);
  const others = actions.exploreStyles.filter(style => !suggested.includes(style));
  const toggle = style => actions.updateOnboarding({
    genres: selected.includes(style) ? selected.filter(item => item !== style) : [...selected, style],
  });

  return (
    <>
      <StepHeading
        title="Your favourite genres"
        subtitle={`Pick at least ${MIN_GENRES}. The ones that glow are where your artists and labels lean.`}
      />
      {ranked === null && <p className="mb-5 text-xs text-muted-foreground">Reading your picks…</p>}
      {suggested.length > 0 && (
        <div className="mb-6">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Suggested for you</span>
          <div className="flex flex-wrap gap-2">
            {suggested.map(style => <GenrePill key={style} label={style} suggested selected={selected.includes(style)} onToggle={() => toggle(style)} />)}
          </div>
        </div>
      )}
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{suggested.length ? 'All genres & styles' : 'Electronic genres & styles'}</span>
      <div className="flex flex-wrap gap-2">
        {others.map(style => <GenrePill key={style} label={style} selected={selected.includes(style)} onToggle={() => toggle(style)} />)}
      </div>
    </>
  );
};

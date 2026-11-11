import { useEffect, useMemo, useState } from 'react';
import { TourBubble } from '@/components/tour/TourBubble';
import { TourSpotlight } from '@/components/tour/TourSpotlight';
import { pickTourArtist, TOUR_STEPS } from '@/lib/tourSteps';
import { useTargetRect } from '@/lib/useTargetRect';

// Any of these open means a modal is up — the tour steps aside until it closes.
const MODAL_FLAGS = ['playlistsModal', 'likesModal', 'historyModal', 'librariesModal', 'followsModal', 'profileModal', 'levelsModal', 'settingsModal', 'heroesModal', 'newReleasesModal', 'premiumModal'];

const nodeIds = state => new Set(state.nodes.map(node => node.id));

// The walkthrough after the onboarding (see tourSteps.js for the steps). Shown
// once per account; finishing or skipping it records tourDoneAt.
export const Tour = ({ state, actions }) => {
  const [index, setIndex] = useState(0);
  const [ctx, setCtx] = useState(() => ({ artist: pickTourArtist(state), snapshot: nodeIds(state), selectedAtEnter: state.selectedId }));
  const steps = useMemo(() => TOUR_STEPS.filter(step => !step.requiresArtist || ctx.artist), [ctx.artist]);
  const step = steps[index];
  const rect = useTargetRect(step.target ? step.target(ctx) : null);
  const text = value => (typeof value === 'function' ? value(ctx, state) : value);
  const onPhone = window.matchMedia('(max-width: 639px)').matches;

  // ctx.snapshot / selectedAtEnter describe the tree as the step begins, so a
  // doing step can tell what the person's own click just added.
  const goTo = (next, patch = {}) => {
    if (next >= steps.length) {
      actions.finishTour();
      return;
    }
    setCtx(current => ({ ...current, ...patch, snapshot: nodeIds(state), selectedAtEnter: state.selectedId }));
    setIndex(next);
  };

  useEffect(() => {
    step.onEnter?.({ actions, state, ctx });
    // Only when a step begins; state/ctx are read as they are at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // A doing step moves on by itself once its condition holds (checked on every
  // engine update, which re-renders the app and this component with it).
  useEffect(() => {
    const patch = step.done?.(state, ctx);
    if (patch) goTo(index + 1, patch);
  });

  if (MODAL_FLAGS.some(flag => state[flag])) return null;

  const wait = step.wait?.(state, ctx) ?? null;
  const next = () => (step.primary ? goTo(index + 1, step.primary.run({ actions, state, ctx })) : goTo(index + 1));
  return (
    <>
      <TourSpotlight rect={rect} interactive={!!step.interactive} />
      {/* Keyed by step so each step's card mounts fresh and takes keyboard focus. */}
      <TourBubble
        key={step.id}
        rect={rect}
        position={index + 1}
        total={steps.length}
        title={text(step.title)}
        body={text(onPhone && step.mobileBody ? step.mobileBody : step.body)}
        wait={wait}
        interactive={!!step.interactive}
        nextLabel={step.primary ? step.primary.label(ctx) : index === 0 ? 'Start the tour' : 'Next'}
        onNext={next}
        onSkipStep={() => goTo(index + 1)}
        onSkipTour={actions.finishTour}
      />
    </>
  );
};

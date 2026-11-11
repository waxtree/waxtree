import { buttonPrimary } from '@/lib/waxtreeUi';

const WIDTH = 320;
const GAP = 14;
const EDGE = 12;
// Rough height of the card, to decide whether it fits under the target.
const ROOM_BELOW = 230;

// Where the card goes: beside a tall target (the tree, the player column) or
// a narrow one at the far left (a node in the tree — so the rest of the tree
// stays visible), under a short one when there's room, otherwise above it.
const placement = rect => {
  if (!rect) return null;
  const width = Math.min(WIDTH, window.innerWidth - EDGE * 2);
  const clampLeft = left => Math.min(Math.max(EDGE, left), window.innerWidth - width - EDGE);
  const roomRight = window.innerWidth - (rect.left + rect.width) > width + GAP * 2;
  if (roomRight && rect.left + rect.width < window.innerWidth * 0.3) {
    return {
      '--bubble-left': `${rect.left + rect.width + GAP}px`,
      '--bubble-top': `${Math.min(Math.max(EDGE, rect.top - 10), window.innerHeight - ROOM_BELOW - EDGE)}px`,
    };
  }
  if (rect.height > window.innerHeight * 0.55) {
    return {
      '--bubble-left': `${clampLeft(roomRight ? rect.left + rect.width + GAP : rect.left - width - GAP)}px`,
      '--bubble-top': `${Math.min(Math.max(EDGE, rect.top + 60), window.innerHeight - ROOM_BELOW - EDGE)}px`,
    };
  }
  if (window.innerHeight - (rect.top + rect.height) > ROOM_BELOW) {
    return { '--bubble-left': `${clampLeft(rect.left)}px`, '--bubble-top': `${rect.top + rect.height + GAP}px` };
  }
  return { '--bubble-left': `${clampLeft(rect.left)}px`, '--bubble-bottom': `${window.innerHeight - rect.top + GAP}px` };
};

// The explanation card of one walkthrough step.
export const TourBubble = ({ rect, position, total, title, body, wait, interactive, nextLabel, onNext, onSkipStep, onSkipTour }) => {
  const anchor = placement(rect);
  const where = !anchor
    ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-sm:bottom-4 max-sm:top-auto max-sm:translate-y-0'
    : anchor['--bubble-bottom'] ? 'left-[var(--bubble-left)] bottom-[var(--bubble-bottom)]' : 'left-[var(--bubble-left)] top-[var(--bubble-top)]';
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      style={anchor || undefined}
      className={`fixed z-[960] w-[min(320px,calc(100vw-24px))] rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-[0_12px_40px_rgba(0,0,0,.35)] ${where}`}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-primary">Step {position} of {total}</p>
      <h2 id="tour-title" className="mt-1 text-base font-bold leading-snug">{title}</h2>
      <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{body}</p>
      {wait === 'loading' && (
        <p className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading from Discogs — a big catalogue can take a moment…
        </p>
      )}
      {wait === 'error' && <p className="mt-2.5 text-xs text-muted-foreground">Discogs didn&apos;t answer right now — carry on, you can open it again later.</p>}
      {interactive && <p className="mt-2.5 text-xs font-semibold text-primary">Your turn — the tour moves on when you&apos;ve done it.</p>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onSkipTour} className="text-xs text-muted-foreground hover:text-foreground">Skip tour</button>
        {interactive
          ? <button type="button" onClick={onSkipStep} className="text-xs font-semibold text-muted-foreground hover:text-primary">Skip this step</button>
          : <button type="button" autoFocus onClick={onNext} disabled={wait === 'loading'} className={`${buttonPrimary} disabled:opacity-40`}>{nextLabel}</button>}
      </div>
    </div>
  );
};

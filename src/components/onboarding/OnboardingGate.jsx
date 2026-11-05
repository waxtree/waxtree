import { useEffect, useRef } from 'react';
import { OnboardingBackdrop } from '@/components/onboarding/OnboardingBackdrop';
import { StepDone } from '@/components/onboarding/StepDone';
import { StepFavorites } from '@/components/onboarding/StepFavorites';
import { StepFrequency } from '@/components/onboarding/StepFrequency';
import { StepGenres } from '@/components/onboarding/StepGenres';
import { StepIntro } from '@/components/onboarding/StepIntro';
import { StepRole } from '@/components/onboarding/StepRole';
import { StepSync } from '@/components/onboarding/StepSync';
import { StepWhy } from '@/components/onboarding/StepWhy';
import { STEP_IDS } from '@/lib/onboardingContent';
import { stepBlocker } from '@/lib/onboardingRules';
import { signOut } from '@/lib/signOut';
import { lightScope } from '@/lib/waxtreeUi';

const renderStep = (stepId, props) => {
  switch (stepId) {
    case 'role': return <StepRole {...props} />;
    case 'intro': return <StepIntro />;
    case 'artists': return <StepFavorites kind="artist" {...props} />;
    case 'labels': return <StepFavorites kind="label" {...props} />;
    case 'genres': return <StepGenres {...props} />;
    case 'frequency': return <StepFrequency {...props} />;
    case 'why': return <StepWhy />;
    case 'sync': return <StepSync {...props} />;
    default: return <StepDone />;
  }
};

// Full-screen, mandatory first-login onboarding. Rendered INSTEAD of the app
// (see WaxTreeApp), so none of the workspace is visible or reachable until
// the last card is finished. Progress lives in state.onboarding.step, so a
// reload — or the full-page Discogs OAuth round trip — resumes in place.
export const OnboardingGate = ({ state, session, actions }) => {
  const scroller = useRef(null);
  const step = Math.min(Math.max(state.onboarding.step || 0, 0), STEP_IDS.length - 1);
  const stepId = STEP_IDS[step];
  const isLast = step === STEP_IDS.length - 1;
  const blocker = stepBlocker(stepId, state, session);
  const goTo = next => actions.updateOnboarding({ step: next });

  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [step]);

  return (
    <div ref={scroller} className={`${lightScope} fixed inset-0 z-[1000] overflow-y-auto bg-white text-foreground`}>
      <OnboardingBackdrop />
      {/* pb-28 keeps the footer buttons clear of the fixed cookie banner. */}
      <div className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-44 pt-6 sm:pb-28 sm:pt-10">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="size-9 object-contain" />
            <span className="text-lg font-bold tracking-tight">WaxTree</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Only when editing an already-finished profile: every change is saved as it's made, so leaving is safe. */}
            {state.onboarding.redo && (
              <button type="button" onClick={() => actions.updateOnboarding({ redo: false })} className="text-xs font-semibold text-primary underline underline-offset-2 transition hover:opacity-80">
                Back to WaxTree
              </button>
            )}
            <span className="text-xs font-medium text-muted-foreground">Step {step + 1} of {STEP_IDS.length}</span>
          </div>
        </header>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={STEP_IDS.length} aria-valuenow={step + 1}>
          <div style={{ '--wt-progress': `${((step + 1) / STEP_IDS.length) * 100}%` }} className="h-full w-[var(--wt-progress)] rounded-full bg-primary transition-all duration-500" />
        </div>

        <main key={stepId} className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300 motion-reduce:animate-none">
          <section className="rounded-3xl border border-border bg-white/90 p-5 shadow-[0_20px_60px_-20px_rgba(27,45,34,0.25)] backdrop-blur sm:p-8">
            {renderStep(stepId, { state, session, actions })}
          </section>
        </main>

        <footer className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-primary disabled:invisible"
          >
            Back
          </button>
          <div className="flex items-center gap-4">
            {blocker && <span className="text-right text-xs text-muted-foreground" role="status">{blocker}</span>}
            <button
              type="button"
              disabled={!!blocker}
              onClick={() => (isLast ? actions.completeOnboarding() : goTo(step + 1))}
              className="rounded-full bg-primary px-7 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLast ? 'Start digging' : 'Continue'}
            </button>
          </div>
        </footer>
        {/* The header menu is hidden behind the gate, so a wrong-account signup needs its own way out. */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Signed in as {session?.user?.email}{' · '}
          <button type="button" onClick={() => signOut(actions)} className="font-semibold text-primary underline underline-offset-2">Sign out</button>
        </p>
      </div>
    </div>
  );
};

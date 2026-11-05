// White canvas with soft brand-green light leaking in from the corners.
export const OnboardingBackdrop = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute -left-40 -top-40 size-[560px] rounded-full bg-accent/25 blur-3xl" />
    <div className="absolute -bottom-52 -right-40 size-[620px] rounded-full bg-primary/20 blur-3xl" />
    <div className="absolute left-1/2 top-1/3 size-[460px] -translate-x-1/2 rounded-full bg-muted/70 blur-3xl" />
  </div>
);

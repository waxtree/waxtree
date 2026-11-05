import { StepHeading } from '@/components/onboarding/StepHeading';
import { WHY_POINTS } from '@/lib/onboardingContent';

export const StepWhy = () => (
  <>
    <StepHeading title="Why we asked" subtitle="Everything you just told us shapes how WaxTree digs for you." />
    <ol className="flex flex-col gap-4">
      {WHY_POINTS.map((point, index) => (
        <li key={point.title} className="flex gap-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
          <div>
            <strong className="block text-[15px] text-foreground">{point.title}</strong>
            <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{point.text}</p>
          </div>
        </li>
      ))}
    </ol>
    <p className="mt-6 text-xs text-muted-foreground">You can change any of this later in Settings.</p>
  </>
);

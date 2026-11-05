import { OptionCard } from '@/components/onboarding/OptionCard';
import { StepHeading } from '@/components/onboarding/StepHeading';
import { FREQUENCY_OPTIONS } from '@/lib/onboardingContent';

export const StepFrequency = ({ state, actions }) => (
  <>
    <StepHeading title="How often do you look for new music?" subtitle="This sets how deep — and how much — WaxTree digs for you." />
    <div role="radiogroup" aria-label="How often do you look for new music?" className="flex flex-col gap-3">
      {FREQUENCY_OPTIONS.map(option => (
        <OptionCard
          key={option.value}
          name="onboarding-frequency"
          title={option.title}
          description={option.description}
          selected={state.onboarding.frequency === option.value}
          onSelect={() => actions.updateOnboarding({ frequency: option.value })}
        />
      ))}
    </div>
  </>
);

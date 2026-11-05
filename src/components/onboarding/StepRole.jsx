import { Compass, Disc3, Headphones } from 'lucide-react';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { StepHeading } from '@/components/onboarding/StepHeading';
import { ROLE_OPTIONS } from '@/lib/onboardingContent';

const ROLE_ICONS = { dj: Disc3, digger: Compass, listener: Headphones };

export const StepRole = ({ state, actions }) => (
  <>
    <StepHeading title="Who are you?" subtitle="Pick the one that fits you best — it shapes how WaxTree digs for you." />
    <div role="radiogroup" aria-label="Who are you?" className="flex flex-col gap-3">
      {ROLE_OPTIONS.map(option => (
        <OptionCard
          key={option.value}
          name="onboarding-role"
          icon={ROLE_ICONS[option.value]}
          title={option.title}
          description={option.description}
          selected={state.onboarding.role === option.value}
          onSelect={() => actions.updateOnboarding({ role: option.value })}
        />
      ))}
    </div>
  </>
);

import { lightScope } from '@/lib/waxtreeUi';
import { OnboardingBackdrop } from '@/components/onboarding/OnboardingBackdrop';
import { PlantLoader } from '@/components/waxtree/PlantLoader';

// Shown while the cloud copy of the account is still being read, so the
// real app (and the onboarding) never flashes before we know which one this
// person needs.
export const OnboardingLoading = () => (
  <div className={`${lightScope} relative flex min-h-dvh items-center justify-center bg-white text-foreground`}>
    <OnboardingBackdrop />
    <div className="relative"><PlantLoader label="Getting WaxTree ready…" /></div>
  </div>
);

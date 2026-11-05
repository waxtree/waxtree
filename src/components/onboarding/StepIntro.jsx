import { Disc, Library, Music2, Tags } from 'lucide-react';
import { StepHeading } from '@/components/onboarding/StepHeading';

const COMING_UP = [
  { icon: Music2, label: 'Your favourite artists and labels' },
  { icon: Tags, label: 'The genres you live in' },
  { icon: Disc, label: 'How often you dig for new music' },
  { icon: Library, label: 'Your music library' },
];

export const StepIntro = () => (
  <>
    <StepHeading
      title="Now tell us more about you and your music taste"
      subtitle="A few quick questions. Your answers help WaxTree build a recommendation engine that is personal to you — what it suggests, how deep it digs, and how often."
    />
    <ul className="flex flex-col gap-2.5">
      {COMING_UP.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-3 rounded-xl border border-border bg-white/70 px-4 py-3 text-sm text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="size-4" aria-hidden="true" /></span>
          {label}
        </li>
      ))}
    </ul>
    <p className="mt-5 text-xs text-muted-foreground">Takes about two minutes. Press Continue when you're ready.</p>
  </>
);

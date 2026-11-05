import { Sprout } from 'lucide-react';

export const StepDone = () => (
  <div className="flex flex-col items-center py-4 text-center">
    <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"><Sprout className="size-8" aria-hidden="true" /></span>
    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">You're all set</h1>
    <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
      Welcome to WaxTree. Everything you entered can be changed — or added to — any time from Settings.
    </p>
  </div>
);

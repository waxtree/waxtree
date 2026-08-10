import { Button } from '@/components/ui/button';

export const AppFailure = ({ error }) => (
  <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-center text-foreground">
    <div className="max-w-lg">
      <img className="mx-auto mb-5 size-20" src="/logo.svg" alt="" />
      <h1 className="text-xl font-bold text-primary">WaxTree could not start</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error?.message || 'Unexpected application error.'}</p>
      <Button className="mt-5 rounded-full" onClick={() => window.location.reload()}>Reload</Button>
    </div>
  </main>
);

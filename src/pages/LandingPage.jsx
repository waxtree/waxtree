import { CookieBanner, ThemeFrame, useTheme } from '@/components/AppChrome';
import { Button } from '@/components/ui/button';

export const LandingPage = () => {
  const [theme, toggleTheme] = useTheme();

  return (
    <ThemeFrame theme={theme} className="relative flex items-center justify-center overflow-hidden p-6">
      <div className="fixed inset-x-0 top-0 flex items-center justify-end gap-2.5 px-6 py-5">
        <Button type="button" variant="outline" size="icon" className="rounded-full" title="Toggle theme" aria-label="Toggle theme" onClick={toggleTheme}>
          {theme === 'dark' ? '☀' : '🌙'}
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <a href="/login">Login</a>
        </Button>
      </div>

      <main className="max-w-[480px] text-center">
        <img className="mx-auto mb-6 size-[120px] object-contain" src="/logo.svg" alt="WaxTree" />
        <h1 className="mb-3.5 text-[38px] font-bold text-primary">WaxTree</h1>
        <p className="mb-9 text-[15px] leading-6 text-muted-foreground">Dig deeper. Explore artists and labels as a living, non-destructive family tree — and never lose track of where you started.</p>
        <Button asChild size="lg" className="h-auto rounded-2xl px-9 py-[15px] text-[15px] font-bold">
          <a href="/register">Create an account</a>
        </Button>
      </main>

      <CookieBanner />
    </ThemeFrame>
  );
};

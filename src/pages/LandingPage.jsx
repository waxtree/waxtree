import { CookieBanner, ThemeFrame, useTheme } from '../components/AppChrome';

export function LandingPage() {
  const [theme, toggleTheme] = useTheme();

  return (
    <ThemeFrame theme={theme} className="relative flex items-center justify-center overflow-hidden p-6">
      <div className="fixed inset-x-0 top-0 flex items-center justify-end gap-2.5 px-6 py-5">
        <button
          type="button"
          title="Toggle theme"
          onClick={toggleTheme}
          className="flex size-8 items-center justify-center rounded-full border border-[var(--wt-border)] bg-[var(--wt-surface)] text-[15px] transition-colors hover:bg-[var(--wt-border)]"
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
        <a className="rounded-full border-[1.5px] border-[var(--wt-border)] px-5 py-2 text-[13px] font-semibold text-[var(--wt-muted)] transition-colors hover:border-[var(--wt-accent)] hover:text-[var(--wt-accent)]" href="/login">Login</a>
      </div>

      <main className="max-w-[480px] text-center">
        <img className="mx-auto mb-6 size-[120px] object-contain" src="/logo.svg" alt="WaxTree" />
        <h1 className="mb-3.5 text-[38px] font-bold text-[#3DAE79]">WaxTree</h1>
        <p className="mb-9 text-[15px] leading-6 text-[var(--wt-muted)]">Dig deeper. Explore artists and labels as a living, non-destructive family tree — and never lose track of where you started.</p>
        <a className="inline-block rounded-[14px] bg-[var(--wt-accent)] px-9 py-[15px] text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[.98]" href="/register">Create an account</a>
      </main>

      <CookieBanner />
    </ThemeFrame>
  );
}

import { Link } from 'react-router-dom';
import { ThemeFrame, useTheme } from '../components/AppChrome';

export function NotFoundPage() {
  const [theme] = useTheme();

  return (
    <ThemeFrame theme={theme} className="flex min-h-dvh items-center justify-center px-6 text-center">
      <main>
        <img className="mx-auto mb-6 size-20 object-contain" src="/logo.svg" alt="" />
        <p className="text-xs font-bold uppercase text-[var(--wt-faint)]">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <Link className="mt-6 inline-flex rounded-full bg-[var(--wt-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90" to="/">
          Back to WaxTree
        </Link>
      </main>
    </ThemeFrame>
  );
}

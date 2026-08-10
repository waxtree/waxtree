import { useEffect, useState } from 'react';

const palettes = {
  dark: {
    '--wt-bg': '#09090B',
    '--wt-surface': '#111114',
    '--wt-elevated': '#17171B',
    '--wt-hover': '#1F1F25',
    '--wt-text': '#E8EDEA',
    '--wt-muted': '#7A9A8A',
    '--wt-faint': '#3E5A4A',
    '--wt-accent': '#5EC47B',
    '--wt-accent-light': '#90E0AA',
    '--wt-border': '#1E1E25',
    '--wt-input': '#17171B',
    '--wt-error': '#F47B5E',
    '--wt-shadow': '0 8px 32px rgba(0,0,0,.85)',
  },
  light: {
    '--wt-bg': '#E8F0EA',
    '--wt-surface': '#F4FBF6',
    '--wt-elevated': '#EAF2EC',
    '--wt-hover': '#D4E8D8',
    '--wt-text': '#1B2D22',
    '--wt-muted': '#3D6B4E',
    '--wt-faint': '#8FB09A',
    '--wt-accent': '#3DAE5A',
    '--wt-accent-light': '#5EC47B',
    '--wt-border': '#C0D9C7',
    '--wt-input': '#FFFFFF',
    '--wt-error': '#D94F2E',
    '--wt-shadow': '0 8px 32px rgba(0,0,0,.12)',
  },
};

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('wt-theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // shadcn/Tailwind's dark: variant (see index.css's @custom-variant)
    // triggers off a `.dark` ancestor class, not data-theme — toggled
    // alongside it so shadcn components (Button, Card, Input, ...) follow
    // the same theme switch as the rest of the app.
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('wt-theme', theme);
  }, [theme]);

  return [theme, () => setTheme(value => value === 'dark' ? 'light' : 'dark')];
}

export function ThemeFrame({ children, theme, className = '' }) {
  return (
    <div
      style={palettes[theme] || palettes.light}
      className={`min-h-dvh bg-[var(--wt-bg)] font-sans text-[var(--wt-text)] ${className}`}
    >
      {children}
    </div>
  );
}

export function ThemeButton({ theme, onToggle }) {
  return (
    <button
      type="button"
      title="Toggle theme"
      aria-label="Toggle theme"
      onClick={onToggle}
      className="fixed right-4 top-4 z-40 flex size-8 items-center justify-center rounded-full border border-[var(--wt-border)] bg-[var(--wt-surface)] text-[15px] transition-colors hover:bg-[var(--wt-hover)]"
    >
      {theme === 'dark' ? '☀' : '🌙'}
    </button>
  );
}

export function Brand({ subtitle }) {
  return (
    <div className="mb-8 text-center">
      <img className="mx-auto mb-[18px] size-[92px] object-contain" src="/logo.svg" alt="" />
      <div className="text-[26px] font-bold text-primary">WaxTree</div>
      <div className="mt-1.5 text-[13px] text-[var(--wt-muted)]">{subtitle}</div>
    </div>
  );
}

function loadGoogleAnalytics() {
  if (document.querySelector('script[data-waxtree-ga]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.dataset.waxtreeGa = 'true';
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-BG6G70ZKRE';
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-BG6G70ZKRE');
}

function loadSentry() {
  if (document.querySelector('script[data-waxtree-sentry]')) return;
  const script = document.createElement('script');
  script.dataset.waxtreeSentry = 'true';
  script.src = 'https://browser.sentry-cdn.com/10.65.0/bundle.tracing.replay.min.js';
  script.crossOrigin = 'anonymous';
  script.onload = () => window.Sentry?.init({
    dsn: 'https://0120197e3869fdd033c9574c0d4e9841@o4511727540305920.ingest.de.sentry.io/4511727608987728',
    integrations: [window.Sentry.browserTracingIntegration(), window.Sentry.replayIntegration()],
    tracesSampleRate: 1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
  });
  document.head.appendChild(script);
}

export function CookieBanner({ includeSentry = false, app = false }) {
  const [visible, setVisible] = useState(() => !localStorage.getItem('wt-cookie-consent'));

  useEffect(() => {
    if (localStorage.getItem('wt-cookie-consent') === 'accepted') {
      loadGoogleAnalytics();
      if (includeSentry) loadSentry();
    }
  }, [includeSentry]);

  if (!visible) return null;

  const choose = accepted => {
    localStorage.setItem('wt-cookie-consent', accepted ? 'accepted' : 'declined');
    setVisible(false);
    if (accepted) {
      loadGoogleAnalytics();
      if (includeSentry) loadSentry();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2000] flex flex-wrap items-center justify-between gap-4 border-t border-[var(--wt-border)] bg-[var(--wt-surface)] px-5 py-4 shadow-[0_-4px_20px_rgba(0,0,0,.15)]">
      <p className="min-w-[220px] flex-1 text-left text-[13px] leading-5 text-[var(--wt-muted)]">
        We use cookies to understand how WaxTree is used and to catch errors. This won't affect your ability to use the {app ? 'app' : 'site'} either way.
      </p>
      <div className="flex shrink-0 gap-2.5">
        <button onClick={() => choose(false)} className="rounded-full border-[1.5px] border-[var(--wt-border)] px-[18px] py-2 text-[13px] font-semibold text-[var(--wt-muted)] hover:border-[var(--wt-muted)]">Decline</button>
        <button onClick={() => choose(true)} className="rounded-full bg-[var(--wt-accent)] px-[18px] py-2 text-[13px] font-semibold text-white hover:opacity-90">Accept</button>
      </div>
    </div>
  );
}

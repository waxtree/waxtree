import { useEffect, useState } from 'react';

const CONSENT_KEY = 'wt-cookie-consent';
const GA_ID = 'G-BG6G70ZKRE';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    Sentry?: { init: (config: Record<string, unknown>) => void };
  }
}

function loadScript(src: string, attrs: Record<string, string> = {}) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
  document.head.appendChild(script);
}

function loadAnalytics() {
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`, { async: 'true' });
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);

  loadScript('https://browser.sentry-cdn.com/10.65.0/bundle.tracing.replay.min.js', {
    crossorigin: 'anonymous',
  });
}

export function CookieBanner() {
  const [choice, setChoice] = useState(() => localStorage.getItem(CONSENT_KEY));

  useEffect(() => {
    if (choice === 'accepted') loadAnalytics();
  }, [choice]);

  if (choice) return null;

  return (
    <div className="cookie-banner">
      <p>
        We use cookies to understand how WaxTree is used and to catch errors. This won't affect
        your ability to use the app either way.
      </p>
      <div className="cookie-banner__actions">
        <button
          className="btn btn--ghost"
          onClick={() => {
            localStorage.setItem(CONSENT_KEY, 'declined');
            setChoice('declined');
          }}
        >
          Decline
        </button>
        <button
          className="btn btn--primary"
          onClick={() => {
            localStorage.setItem(CONSENT_KEY, 'accepted');
            setChoice('accepted');
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}

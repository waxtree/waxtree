import { useState } from 'react';
import { buttonPrimary, buttonSecondary } from '@/lib/waxtreeUi';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMIND_AFTER_DAYS = 14;
const SNOOZE_DAYS = 3;
const SNOOZE_KEY = 'wt-rescan-snooze-until';

const readSnooze = () => {
  try { return Number(localStorage.getItem(SNOOZE_KEY)) || 0; } catch { return 0; }
};

// Browsers can't rescan a folder in the background, so instead of promising
// an automatic rescan, WaxTree asks once the last one is 14 days old and
// opens the sync tab so it takes one click.
export const RescanReminder = ({ session, actions }) => {
  const [snoozedUntil, setSnoozedUntil] = useState(readSnooze);
  const scannedAt = Date.parse(session?.user?.user_metadata?.library_scanned_at || '');
  const now = Date.now();
  if (!scannedAt || now - scannedAt < REMIND_AFTER_DAYS * DAY_MS || now < snoozedUntil) return null;

  const days = Math.floor((now - scannedAt) / DAY_MS);
  const snooze = () => {
    const until = Date.now() + SNOOZE_DAYS * DAY_MS;
    try { localStorage.setItem(SNOOZE_KEY, String(until)); } catch { /* blocked storage: it just comes back next visit */ }
    setSnoozedUntil(until);
  };
  const openSync = () => actions.mutateState(value => { value.librariesModal = true; value.librariesTab = 'sync'; });

  return (
    <div role="status" className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-border bg-secondary px-4 py-2 text-xs text-foreground">
      <span>It's been {days} days since you last scanned your music folder — rescan to keep your library up to date.</span>
      <span className="flex items-center gap-2">
        <button type="button" className={buttonPrimary} onClick={openSync}>Rescan now</button>
        <button type="button" className={buttonSecondary} onClick={snooze}>Remind me later</button>
      </span>
    </div>
  );
};

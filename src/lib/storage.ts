const DISPOSABLE_PREFIXES = ['ct:', 'ct2:', 'wt-yt-matches', 'wt-cosine-ids-v2'];

export function clearDisposableCacheIfStorageIsFull() {
  try {
    localStorage.setItem('wt-quota-probe', '1');
    localStorage.removeItem('wt-quota-probe');
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && DISPOSABLE_PREFIXES.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  }
}

export function estimateLocalStorageBytes() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) ?? '';
    total += key.length + (localStorage.getItem(key)?.length ?? 0);
  }
  return total;
}

export function makeRoomForAuthSession() {
  try {
    if (estimateLocalStorageBytes() < 3 * 1024 * 1024) return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('ct:') || key?.startsWith('ct2:')) localStorage.removeItem(key);
    }
  } catch {
    // Best effort. Auth should never be blocked by cache cleanup.
  }
}

export const emailIsValid = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const purgeCt2Keys = () => {
  const keys = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith('ct2:')) keys.push(key);
  }
  keys.forEach(key => localStorage.removeItem(key));
};

export const clearApiCacheIfNearQuota = () => {
  try {
    localStorage.setItem('wt-quota-probe', '1');
    localStorage.removeItem('wt-quota-probe');
  } catch (error) {
    if (error.name === 'QuotaExceededError') purgeCt2Keys();
  }
};

// Confirmed live: a full-to-quota localStorage origin makes Supabase's own
// session-token write fail silently right when signInWithPassword() runs,
// producing an unrecoverable sign-in loop with no error on either side.
// The disposable ct2: tree cache is the dominant, purely-regenerable
// consumer of that space — clearing it here, right before the write that
// actually needs the room, is cheap insurance.
export const freeRoomForSessionWrite = () => {
  try {
    let total = 0;
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      total += key.length + (localStorage.getItem(key) || '').length;
    }
    if (total < 3 * 1024 * 1024) return; // plenty of headroom already
    purgeCt2Keys();
  } catch {
    // Best effort: authentication must not be blocked by cache cleanup.
  }
};

// Not exported — only passwordStrength() below needs it; nothing else in
// the app should depend on the raw scale.
const strengthLevels = [
  { label: '', barClass: '', textClass: '', width: 'w-0' },
  { label: 'Weak', barClass: 'bg-[#F47B5E]', textClass: 'text-[#F47B5E]', width: 'w-1/5' },
  { label: 'Fair', barClass: 'bg-[#F4C15E]', textClass: 'text-[#F4C15E]', width: 'w-2/5' },
  { label: 'Good', barClass: 'bg-[#90E0AA]', textClass: 'text-[#90E0AA]', width: 'w-3/5' },
  { label: 'Great', barClass: 'bg-[#5EC47B]', textClass: 'text-[#5EC47B]', width: 'w-4/5' },
  { label: 'Strong', barClass: 'bg-primary', textClass: 'text-primary', width: 'w-full' },
];

export const passwordStrength = password => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return password ? strengthLevels[Math.max(1, Math.min(score, 5))] : strengthLevels[0];
};

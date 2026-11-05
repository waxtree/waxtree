// Shared className strings for the handful of places a full shadcn <Button>
// doesn't fit (dense inline controls, modal-internal actions) but still use
// shadcn's own color tokens for consistency with the rest of the app.
export const buttonSecondary = 'rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary';
export const buttonPrimary = 'rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90';
export const modalInput = 'w-full rounded-[10px] border-[1.5px] border-border bg-secondary px-3 py-2 text-[13px] outline-none focus:border-primary';

// Re-points the shadcn tokens at the light brand palette for everything
// inside, whatever theme the app is in — the onboarding is always a white,
// brand-green screen, so its text/borders/inputs must not flip with .dark.
export const lightScope = '[--background:#FFFFFF] [--foreground:#1B2D22] [--card:#FFFFFF] [--card-foreground:#1B2D22] [--primary:#3DAE79] [--primary-foreground:#FFFFFF] [--secondary:#EAF2EC] [--secondary-foreground:#1B2D22] [--muted:#D4E8D8] [--muted-foreground:#3D6B4E] [--accent:#5EC47B] [--border:#C0D9C7] [--input:#FFFFFF] [--ring:#3DAE79]';

// Horizontal-only, thin-scrollbar tab strip — shared by Sidebar's branch
// tabs and PlaylistsModal's playlist tabs. overflow-y-hidden isn't just
// belt-and-suspenders: overflow-x set to a value other than 'visible' while
// overflow-y stays 'visible' makes the browser force overflow-y to 'auto'
// too (a real CSS quirk, not a typo) — that's what let an intentionally
// horizontal-only tab row pick up a vertical scroll attempt on a two-finger
// swipe. The [&::-webkit-scrollbar] rules + scrollbar-width:thin keep the
// horizontal bar itself slim instead of the OS's fat overlay scrollbar
// briefly covering the tab labels while actively scrolling.
export const hScrollThin = 'overflow-x-auto overflow-y-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border';

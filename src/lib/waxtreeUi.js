// Shared className strings for the handful of places a full shadcn <Button>
// doesn't fit (dense inline controls, modal-internal actions) but still use
// shadcn's own color tokens for consistency with the rest of the app.
export const buttonSecondary = 'rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary';
export const buttonPrimary = 'rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90';
export const modalInput = 'w-full rounded-[10px] border-[1.5px] border-border bg-secondary px-3 py-2 text-[13px] outline-none focus:border-primary';

Waitlist Flow — saved Jul 13 2026

Snapshot of the "Landing Page Waitlist" + "Registration Waitlist" pages,
saved before switching the live site back to normal full account
registration (public launch not out yet, so the waitlist flow isn't
needed live for now — kept here to reactivate later).

Contents:
- index.html    → "Landing Page Waitlist": logo, tagline, centered
                   "Join the Waitlist" button (→ register.html), "Login"
                   link top-right
- register.html → "Registration Waitlist": Name (optional) + Email +
                   "How did you find out about us?" (optional) fields,
                   no password. Inserts into the `waitlist` Supabase
                   table, no account is created, shows a thank-you
                   confirmation on success.
- waitlist.sql  → the Supabase table + RLS policy this form writes to
                   (insert-only from anon, no read-back from the client)

To reactivate this flow later:
1. Copy index.html and register.html from this folder back over the
   ones in the project root (crate-tree/).
2. Confirm the `waitlist` table already exists in Supabase (it should,
   from the original setup) — if not, re-run waitlist.sql in the
   Supabase SQL Editor.
3. Commit and push.

Note: if index.html/register.html picked up other changes in the
meantime (new logo, resized elements, GA wiring, etc.) while running
the normal-registration flow, re-apply those same changes on top of
this saved version before reactivating — this snapshot is frozen at
Jul 13 2026 and won't include anything changed after that.

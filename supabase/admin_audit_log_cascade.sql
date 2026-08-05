-- ============================================================
-- WaxTree — admin_audit_log: allow account deletion to cascade through it
-- ============================================================
-- Run this once in the Supabase Dashboard → SQL Editor.
--
-- admin_audit_log.sql's own FKs (admin_id, target_user_id -> auth.users)
-- were created with no ON DELETE behavior, which defaults to NO ACTION —
-- deleting a user who was ever an admin actor OR a tier-toggle target
-- would fail outright with a foreign-key violation. Every other user-data
-- table in this project already cascades (user_state, user_state_history,
-- digging_events, profiles/sessions/trees/nodes) — this brings the audit
-- log in line so "delete my account" (api/delete-account.js) genuinely
-- works for any user, not just ones who've never appeared in this table.
-- ============================================================

alter table public.admin_audit_log
  drop constraint admin_audit_log_admin_id_fkey,
  add constraint admin_audit_log_admin_id_fkey
    foreign key (admin_id) references auth.users(id) on delete cascade;

alter table public.admin_audit_log
  drop constraint admin_audit_log_target_user_id_fkey,
  add constraint admin_audit_log_target_user_id_fkey
    foreign key (target_user_id) references auth.users(id) on delete cascade;

-- Relay CRM initial-schema rollback.
-- Source SHA256: F9731A59A787B389D41CC786BE034B9EDA1B124B5689311E669DD111F0D3A295
-- PRECONDITIONS: pre-UP inventory established that all named CRM objects were absent;
-- the UP transaction was committed successfully; any CRM data has been backed up.
-- This removes CRM data together with the schema. Never use after a conflicting or
-- partially applied UP unless object provenance has been independently established.
-- Intentionally retains shared pgcrypto, auth.users, roles, and migration history.
-- No CASCADE: an unexpected external dependency aborts and rolls back the whole DOWN.
-- IF EXISTS makes a repeat DOWN harmless only while these names remain unrepurposed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DROP FUNCTION IF EXISTS public.bootstrap_workspace(text);

-- Referencing tables precede referenced tables. Their indexes, constraints,
-- RLS policies, triggers, and owned audit_events identity sequence drop with them.
DROP TABLE IF EXISTS public.audit_events;
DROP TABLE IF EXISTS public.notes;
DROP TABLE IF EXISTS public.inquiries;
DROP TABLE IF EXISTS public.clients;
DROP TABLE IF EXISTS public.memberships;
DROP TABLE IF EXISTS public.workspaces;

-- Trigger functions remain after their owning tables and triggers are removed.
DROP FUNCTION IF EXISTS public.audit_note_insert();
DROP FUNCTION IF EXISTS public.guard_and_audit_inquiry_update();
DROP FUNCTION IF EXISTS public.audit_inquiry_insert();
DROP FUNCTION IF EXISTS public.normalize_inquiry_insert();
DROP FUNCTION IF EXISTS public.guard_client_write();
DROP FUNCTION IF EXISTS public.can_write_workspace(uuid);
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid);

DROP TYPE IF EXISTS public.audit_action;
DROP TYPE IF EXISTS public.inquiry_status;
DROP TYPE IF EXISTS public.inquiry_source;
DROP TYPE IF EXISTS public.member_role;
COMMIT;

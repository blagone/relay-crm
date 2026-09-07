# Relay CRM — threat model and release checks

Status: design review, 2026-09-07. No claim of tested production isolation until the integration checks below run against configured Supabase.

## Assets and trust boundaries

Assets: customer contact details, commercial amounts, notes, memberships, authenticated sessions and trustworthy audit history. Boundaries: browser -> Next.js actions/routes -> user-scoped Supabase API -> PostgreSQL/RLS; provider email callback -> application redirect; untrusted persisted demo data -> demo renderer. Browser UI, IDs, claimed roles and every action argument are untrusted.

The public demo contains invented data and local browser edits. It has no authority over production. The application must never ship an administrative database key or use a shared authenticated demo account with access to real customer records.

## Threats and mandatory mitigations

| Threat | Mitigation | Verification |
| --- | --- | --- |
| Cross-workspace IDOR | RLS on all tables, membership checks, composite tenant FKs, user-scoped client | tenant A submits B's client/inquiry/assignee IDs via direct API; no read/write |
| Role escalation | database-derived membership role, no self-service membership updates | viewer changes role/workspace fields and calls mutations directly; denied |
| Broken action authorization | validate identity/resource permission inside every action and DAL path | bypass page navigation and call action unauthenticated |
| RLS helper recursion/definer abuse | narrowly scoped helper, fixed search_path, restricted EXECUTE grants, no caller-supplied actor | unauthenticated helper/bootstrap invocation; forged actor; nested policy tests |
| Fake auth or stale sessions | official SSR cookies; signed claims validation; current membership checks; fresh auth check for sensitive operations | tampered/expired JWT denied; revoked membership loses access |
| Open redirect/account callback abuse | exact configured callback origins and relative redirect allowlist | external URL, protocol-relative path, encoded redirect probes rejected |
| Cross-user response leakage | no public cache of authenticated responses/Set-Cookie; explicit DTOs | request same path as two accounts, verify separate content and cache headers |
| Stored XSS | plain text rendering, no raw HTML, bounded fields; restrictive resource policy compatible with app | script-like names and notes display as text |
| SQL/filter injection | parameterized Supabase queries, escape search wildcards/filter syntax, strict allowlist sort fields | query strings containing filter operators return no extra scope |
| CSRF | preserve Next.js origin checks; no permissive allowedOrigins; non-action mutations use explicit same-origin checks | foreign-origin mutation denied |
| Concurrent lost updates | expected version conditional update; visible conflict message | two editors update same version; only one succeeds |
| Audit tampering or split commits | restricted append-only audit with transaction-local trigger, actor from auth.uid | direct audit mutation denied; forced trigger failure leaves no business update |
| Sensitive data in logs | allowlisted audit metadata, generic auth errors, redact request bodies/tokens | inspect logs for contact text, cookies and keys |
| Resource exhaustion | bounded pagination, string/body limits, provider auth rate limits; shared limiter before public ingestion features | oversized forms fail validation; no unbounded listing |
| Demo storage corruption | parse/schema guards, version migrations, bounded records, recover/reset UX | malformed JSON, wrong versions, denied storage, quota error |
| Supply chain or accidental secrets | lockfile, dependency review, env example without values, secret scanning | inspect client bundle/repository and CI output |
| Destructive migration | additive migration phases, disposable rehearsal, production backup before changes | old app compatibility plus restore rehearsal |

## Risks deliberately deferred

- No uploads or external URL fetching means no SSRF/attachment-processing surface in MVP.
- No payment processing, arbitrary automation or customer email sending.
- No promise of regulatory certification, point-in-time recovery or full audit retention beyond configured service capabilities.
- Provider availability/email delivery and account recovery remain external dependencies; show actionable errors rather than claiming delivery succeeded if provider rejected it.
- Public demo browser data is not confidential storage. Clear banner and reset action are required.

## Security release evidence

Release report must distinguish PASS, FAIL and NOT RUN. Missing cloud credentials mean auth, RLS and real persistence checks are NOT RUN, not PASS. Minimum production gate: authenticated persistence across sessions; A/B tenant isolation using direct REST/RPC access; owner/manager/viewer write checks; no service-role key in runtime/client; immutable transactional audit; version conflict test; login/logout/callback tests; and production cache inspection.

Escalate unexpected privilege escalation, secret exposure, tenant leakage or destructive migration uncertainty for architecture/security review before publishing real-data mode.

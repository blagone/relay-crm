# Relay CRM — architecture and engineering handoff

Decision date: 2026-09-07. Status: approved design for the first implementation, not a claim that cloud services are configured.

## Product and boundaries

Relay is a compact Russian-language CRM for a freelancer or small studio: capture an inquiry, understand its value, move it through a sales pipeline and retain a useful activity history. It complements Flowboard rather than becoming a second task board.

MVP screens: overview, inquiries (table and pipeline), inquiry detail/editor, clients, activity and workspace settings. Navigation, search, status filters, empty/error/loading states and keyboard-operable dialogs must work on mobile and desktop. The identity should be independent of the portfolio: quiet light workspace, deep ink typography, restrained teal accent and strong information hierarchy. Money uses integer minor units and a fixed workspace currency; format RUB with Intl, never sum different currencies.

Out of scope: payments, email sending, file uploads, public lead-ingestion endpoints, arbitrary custom roles, real-time collaboration, team invitations and integrations. Do not add placeholder controls that imply these are working.

## Technology decision

- Next.js 16 App Router, TypeScript strict, React, Tailwind CSS and accessible native controls.
- Supabase PostgreSQL, Supabase Auth and `@supabase/ssr` for production persistence and sessions. SQL migrations remain committed and reproducible.
- Zod input schemas; Vitest domain/schema tests; Playwright E2E; SQL/RLS integration tests against a disposable Supabase environment.
- Vercel for Next.js hosting; Supabase for managed database/auth. Pin resolved dependencies in the lockfile. Read the installed Next.js docs before implementation.

Why this option: one managed authentication/database boundary and database-level tenant isolation without inventing passwords or sessions. SQLite is convenient locally but unsuitable for ephemeral Vercel disk persistence. A custom auth server and separate ORM add migration and session complexity before the product benefits from it.

## Explicit operating modes

1. `/demo` is an immediately usable portfolio demonstration with synthetic seed data. A clearly visible banner states that changes are stored in this browser and are not a connected account. A reset action requires confirmation. Its versioned localStorage adapter handles malformed/full/unavailable storage and validates restored data. Never put secrets or authentic customer records in seeds. Demo access does not create an authenticated user.
2. `/app` is authenticated production mode backed by Supabase. Missing server configuration shows an honest setup/unavailable state; it must not silently switch to demo and pretend to persist to the database. Authentication is shown as working only after live end-to-end verification.

Share domain types, schemas, selectors and UI across modes, not authority. Browser demo roles are presentation fixtures and never authorize a server mutation. A discriminated `mode` value prevents implicit cross-mode writes. Demo import must never feed the production adapter automatically.

## Roles and permissions

All reads and writes are restricted to an active workspace membership. MVP supports owner, manager and viewer. Workspace creation grants its authenticated creator owner via one controlled SQL transaction. Invitation/role-management UI is deferred, so seed additional test memberships administratively in test fixtures only.

| Operation | owner | manager | viewer |
| --- | --- | --- | --- |
| Read workspace clients, inquiries, activity | yes | yes | yes |
| Create/update clients and inquiries, add notes | yes | yes | no |
| Move inquiry status, archive/restore | yes | yes | no |
| Change workspace display name | yes | no | no |
| Change memberships or hard-delete data | deferred | no | no |

Authorization is based on current database membership, never user-editable profile metadata, submitted role, hidden form inputs or client state. Removing a membership must revoke subsequent database access even with an unexpired JWT.

## Data model

Use UUID primary keys and timestamptz timestamps. Every workspace-owned relation has `workspace_id NOT NULL`; add unique `(workspace_id,id)` keys so composite FKs enforce same-workspace relations. Keep identity contact information out of audit payloads unless needed for the stated feature.

- `workspaces`: id, name (1..80), currency (`RUB` in MVP), created_by auth.users FK, created_at.
- `memberships`: workspace_id, user_id auth.users FK, role enum, created_at; composite PK `(workspace_id,user_id)`.
- `clients`: id, workspace_id, name (1..120), company (0..160), email nullable (max 254), phone nullable (max 40), created_at, updated_at, archived_at nullable, version integer default 1.
- `inquiries`: id, workspace_id, client_id composite FK, title (1..160), description (0..5000), source enum `website/telegram/referral/other`, status enum `new/contacted/proposal/won/lost`, amount_minor bigint (0..100000000000), assignee_id nullable (workspace membership FK), next_contact_on nullable SQL date, created_at, updated_at, closed_at nullable, archived_at nullable, version integer default 1.
- `notes`: id, workspace_id, inquiry_id composite FK, author_id authenticated user FK, body (1..4000), created_at. Append-only in MVP.
- `audit_events`: bigint identity, workspace_id, inquiry_id nullable, actor_id nullable, action enum, entity_type, entity_id, metadata jsonb constrained to an allowlist, created_at. Immutable to app users.

Indexes: memberships(user_id,workspace_id); inquiries(workspace_id,status,updated_at DESC,id), inquiries(workspace_id,next_contact_on), clients(workspace_id,name), notes(workspace_id,inquiry_id,created_at), audit_events(workspace_id,created_at DESC,id). Add a trigram index only after measured search needs; small MVP uses bounded escaped search, max query 100 chars, page size 25, max 100. Use a deterministic secondary id ordering for stable pagination. Search only fields within the authenticated workspace.

## Auth and data boundaries

Use official cookie-based Supabase SSR clients and a Next.js `proxy.ts` session-refresh layer; reuse the response carrying refreshed cookies. Validate JWT identity with `getClaims()` for routine checks; do not trust `getSession()` as authentication proof. For account-sensitive operations use a fresh auth-server check via `getUser()` as well. JWT local validation is not instant session-revocation verification.

Use configured password login/signup with verified email and password recovery, or choose magic-link login consistently; first implementation may choose password auth to avoid relying on delivery for repeat logins. Confirm email before workspace bootstrap. Allow only internal relative redirect targets from an explicit allowlist. Add provider rate limits and avoid revealing whether a login email exists. Never store passwords or tokens in custom localStorage. Public Supabase URL/publishable key may be client-exposed; service-role key must not be required by the deployed application.

Server Components read through a `server-only` data-access layer returning explicit DTOs. Every Server Action and Route Handler authenticates and authorizes independently; page/proxy checks alone are insufficient. Actions validate all submitted fields, invoke a user-scoped Supabase client and revalidate only affected paths after success. No shared caching of session responses or tenant DTOs; authenticated pages and cookies must not be cached publicly. Public demo assets can be static.

Suggested layout:

```text
src/app/(public)/page.tsx, demo/page.tsx
src/app/(auth)/login/page.tsx, auth/callback/route.ts
src/app/(workspace)/app/page.tsx
src/app/actions/{clients,inquiries,notes,workspace}.ts
src/components/crm/*
src/lib/domain/{types,schemas,permissions,selectors}.ts
src/lib/demo/{seed,storage}.ts
src/lib/supabase/{client,server,proxy}.ts
src/lib/server/{auth,queries,mutations}.ts
supabase/migrations/*
tests/{unit,e2e,rls}/*
```

## Mutation, workflow and audit consistency

Statuses permit new -> contacted/lost; contacted -> proposal/lost; proposal -> won/lost; won/lost -> contacted (explicit reopen). Disallow other transitions and expose only valid choices. Won/lost set closed_at; reopen clears it. Archiving is independent of status and hides records from active views without changing revenue history. Document whether metrics include archived records; default dashboard pipeline excludes archived, won revenue uses non-archived won inquiries.

Update commands include expected `version`; SQL uses `WHERE version = expected_version` and increments it. Zero affected rows becomes a conflict/not-found result, never silent last-write-wins. A retry must refresh the current record rather than reapplying stale input.

Database triggers generate audit entries in the same transaction as mutations and determine actor from `auth.uid()`. Record action, changed field names and status transitions; avoid copying full notes, email, phone, session headers or credentials into metadata. Trigger function privileges are minimal, search_path fixed, and direct insert/update/delete on audit_events revoked for application roles. Test exceptions so business row and audit row either both commit or both roll back.

Enable RLS on every exposed table. SELECT checks membership; INSERT/UPDATE policies use both USING and WITH CHECK plus write-role checks. Clients/inquiries cannot change workspace_id. Restrict direct membership/workspace mutations; bootstrap uses a carefully granted function with authenticated actor verification, fixed search_path and bounded creation. Avoid recursive membership policies: use a narrowly scoped membership helper with reviewed SECURITY DEFINER privileges or nonrecursive ownership strategy. Application-side checks improve errors, RLS enforces authority.

Validation must exist at UI, action and database layers: trimmed required strings, maximum lengths, enum checks, nonnegative safe integer amounts, real ISO dates, email syntax and same-workspace IDs. Reject unknown mutation keys. Treat all saved text as plain text; do not render it through raw HTML. CSV import/export and rich text remain deferred.

## Testing and deployment gates

| Layer | Required checks |
| --- | --- |
| Unit | schema bounds, impossible dates, amount conversion, permissions, every allowed/rejected status transition, metrics, storage migration/corruption |
| Component/E2E | create/edit inquiry, client selection, search/filter/empty state, status change, archive/restore, note, demo reset, refresh persistence, 390px/1440px overflow, keyboard dialog/focus |
| Auth | logged-out direct action denied, expired session, callback redirect allowlist, verified-email bootstrap, signout, missing-config state |
| Database/RLS | two tenants + three roles; forged workspace/client/assignee IDs; viewer direct REST write denied; membership removal; audit immutability; optimistic conflict; trigger rollback |
| Build | install lockfile, lint, typecheck, unit tests and production build |
| Production | public/demo HTTP 200, auth callback allowlist, real account create/read/update/reload from a second session, zero cross-tenant results |

Create `.env.example` with names and descriptions only. Production requires Supabase project, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and canonical `NEXT_PUBLIC_SITE_URL`; configure exact auth redirect origins. Apply migrations to a disposable instance first, execute RLS tests, then back up and migrate production. Public demo can deploy first with authentication clearly marked unconfigured. Preview deploys must use separate test data/project, not production credentials. No production-ready security claim until live auth/RLS gates pass.

Rollback: redeploy last known-good application commit. Schema changes are additive first; do not drop previous columns in the same release. Test migrations on disposable data and retain a reviewed backup restoration procedure. Reversing a migration that contains user data is not equivalent to rolling back application code.

## Acceptance and engineer handoff

Milestone A (works without cloud credentials): coherent styled `/demo`, synthetic clients/inquiries, all core workflows, validated versioned persistence, keyboard/mobile QA, meaningful metrics and no dead controls. Authentication setup page is truthful. Deliver passing tests and screenshots.

Milestone B (real full-stack): SQL migrations and RLS policy tests, configured Supabase, actual auth/session, persistent CRUD via server boundaries, transactional audit and concurrency handling. Provide test accounts in a disposable project, never commit their passwords. Demonstrate tenant isolation and viewer read-only behavior through direct API tests, not UI alone.

Milestone C: production smoke verification, metadata/social preview, repository README and portfolio case only after actual product state is known.

Implement the smallest vertical slice first: schema -> domain -> demo overview/inquiries -> cloud auth/client + inquiries actions -> RLS tests -> remaining screens. Keep adapters behind typed boundaries and report which milestone is actually verified. Preserve other contributors' changes.

## Source references consulted

- Next.js authentication boundaries: https://nextjs.org/docs/app/guides/authentication
- Next.js data/security boundaries: https://nextjs.org/docs/app/guides/data-security
- Supabase SSR setup: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase JWT validation and session caching caveats: https://supabase.com/docs/guides/auth/server-side/advanced-guide

These sources inform the auth boundary. The schema, product workflow and milestone split above are project-specific design decisions.

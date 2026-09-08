# Inquiry attachments — stage 1

## Architecture

- Private `inquiry-attachments` bucket: 2 MiB/object, PDF/TXT/PNG/JPEG only. Word/Excel documents must be exported to PDF for this slice.
- Separate `public.inquiry_attachments` metadata has a tenant-bound inquiry FK. No browser INSERT/UPDATE/DELETE grants. RPCs require current authenticated owner/manager membership; reservation checks active inquiry and serializes a 20-file/inquiry cap.
- State machine: reserve pending → upload through Storage API → verify object metadata → ready; deletion first marks deleting → Storage API remove → removed. Failed/uncertain operations remain visible to writers for explicit retry/cleanup; viewers only see completed files. Removed rows and audit remain as tombstones.
- Storage RLS independently enforces tenancy, role, path reservation and state. No UPDATE/upsert/move policy. Files use generated paths, never user filenames. Revoking membership removes subsequent access. No service-role key.
- Authenticated `/app/attachments/[id]` download checks fresh `auth.getUser()` and membership, serves only ready files with `attachment`, octet-stream, no-store, nosniff and sandbox headers. No public or persisted signed URLs.
- Upload input checks Zod metadata, file extension and basic byte signatures/UTF-8. These checks are format validation, not malware scanning; no inline preview. Direct Storage API writers still remain governed by bucket MIME/size and RLS.
- Audit uses existing inquiry `updated` events with `changed_fields: [attachment_added|attachment_removed]`, without filenames/content/secrets in the audit payload.
- Next Server Action request budget is 3 MiB to accommodate multipart overhead around the 2 MiB file limit.

## Deployment order

1. Execute `supabase/migrations/202609080005_inquiry_attachments.sql` in the existing project's Supabase SQL Editor. This creates metadata, functions, policies and private bucket. No new keys, domains or paid provider needed.
2. Deploy application using `npx vercel --prod --yes` after local tests/typecheck/lint/build.
3. Open active inquiry → Files and documents → upload a harmless TXT/PDF. Show files, download and compare bytes. Logout/login and list/download again.
4. Verify as a viewer: list/download succeeds; upload/remove RPC and direct Storage attempts are denied. Verify a different workspace sees neither metadata nor object. Use two real confirmed test accounts; never publish their credentials.
5. Verify archive hides upload but preserves download; manager/owner can remove a file including a failed operation. Delete then refresh: item disappears and the old download URL returns 404.
6. Confirm history has attachment-added/removed events. Test oversized/disallowed files, interrupted upload and retry cleanup. Remove only generated test files.

## Rollback

Redeploy previous application revision first. If attachment access must be disabled, execute `supabase/rollbacks/202609080005_inquiry_attachments.sql`. It drops only these three Storage policies and revokes attachment table/RPC privileges. It keeps every blob, metadata row and audit event. Do not delete storage rows with SQL: cleanup must use the Storage API. To re-enable after this rollback, restore the three policies and grants from the forward migration, not the whole CREATE TABLE migration.

## Evidence boundary

Local unit tests cover schema/input, fresh auth, viewer denial, membership-derived workspace, generated object path, failed reservation/upload/finalization/delete, download headers and foreign-item denial. SQL text assertions are not proof of hosted Supabase RLS or storage service operation. Production acceptance requires the steps above after the migration/deploy.

Primary references: https://supabase.com/docs/guides/storage/security/access-control ; https://supabase.com/docs/guides/storage/schema/design ; bundled Next.js docs `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` and `03-file-conventions/route.md`.

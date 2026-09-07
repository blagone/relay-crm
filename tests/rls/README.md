# Cloud test status

Milestone A does not configure Supabase. The migration is prepared for disposable-environment rehearsal, but these checks remain **NOT RUN** until Milestone B:

- two-tenant isolation and forged cross-workspace IDs;
- owner/manager/viewer direct REST writes;
- membership revocation with a still-live JWT;
- transactional audit failure rollback and audit immutability;
- optimistic version conflict;
- login, logout, callback allowlist and second-session persistence.

Do not reinterpret this file as passing security evidence.

#!/usr/bin/env bash
set -euo pipefail

USER_ID="e3611275-fe8c-44fa-b3e3-ab659a284ca3"

if [[ "${1:-}" == "--dry-run" ]]; then
  printf 'ROLLBACK=DRY_RUN_PASS user_id=%s deletes=workspace,user expected_final=0,0\n' "$USER_ID"
  exit 0
fi

if [[ "${CONFIRM_RELAY_RUNTIME_CLEANUP:-}" != "YES" || -z "${DATABASE_URL:-}" ]]; then
  printf 'ROLLBACK=NOT_CONFIRMED required=CONFIRM_RELAY_RUNTIME_CLEANUP=YES,DATABASE_URL\n' >&2
  exit 3
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
BEGIN;
DELETE FROM public.workspaces WHERE created_by = '$USER_ID'::uuid;
DELETE FROM auth.users WHERE id = '$USER_ID'::uuid;
DO \$\$ BEGIN
  IF (SELECT count(*) FROM public.workspaces WHERE created_by = '$USER_ID'::uuid) <> 0 THEN RAISE EXCEPTION 'workspace cleanup failed'; END IF;
  IF (SELECT count(*) FROM auth.users WHERE id = '$USER_ID'::uuid) <> 0 THEN RAISE EXCEPTION 'user cleanup failed'; END IF;
END \$\$;
COMMIT;
SQL
printf 'ROLLBACK=APPLIED user_id=%s final=0,0\n' "$USER_ID"

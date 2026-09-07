#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SQL="$ROOT/supabase/rollback/202609070001_initial.down.sql"
EXPECTED="122361d41ed811308c869a1457de26b91c0b24f6e4051ac4228e9a3aa0cd050f"
# Git may check out this text file with CRLF on Windows. Hash its canonical LF form.
ACTUAL="$(tr -d '\r' < "$SQL" | sha256sum | awk '{print $1}')"

if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  printf 'ROLLBACK=HASH_MISMATCH expected=%s actual=%s\n' "$EXPECTED" "$ACTUAL" >&2
  exit 2
fi

if [[ "${1:-}" == "--dry-run" ]]; then
  printf 'ROLLBACK=DRY_RUN_PASS sha256=%s state=ready-to-drop-6-tables-8-functions-4-enums\n' "$ACTUAL"
  exit 0
fi

if [[ "${CONFIRM_RELAY_CRM_ROLLBACK:-}" != "YES" || -z "${DATABASE_URL:-}" ]]; then
  printf 'ROLLBACK=NOT_CONFIRMED required=CONFIRM_RELAY_CRM_ROLLBACK=YES,DATABASE_URL\n' >&2
  exit 3
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL"
printf 'ROLLBACK=APPLIED sha256=%s\n' "$ACTUAL"

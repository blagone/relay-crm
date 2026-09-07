#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 1 ]]; then echo "usage: ROLLBACK.sh TARGET" >&2; exit 2; fi
target="$(cd "$1" && pwd)"
case "$(basename "$target")" in rollback-fixture-*) ;; *) echo "target rejected" >&2; exit 3;; esac
[[ -f "$target/.relay-crm-rollback-target" ]] || { echo "marker missing" >&2; exit 4; }
self="$(cd "$(dirname "$0")" && pwd)"
dest="$target/supabase/migrations/202609070001_initial.sql"
[[ -f "$dest" ]] || { echo "migration missing" >&2; exit 5; }
cp "$self/baseline/202609070001_initial.sql" "$dest"
hash="$(sha256sum "$dest" | awk '{print toupper($1)}')"
echo "ROLLBACK=PASS hash=$hash state=original-single-trigger-and-policy"
#!/usr/bin/env bash
set -euo pipefail
repo="${1:-.}"
target="${2:-artifacts/verification/client-csv-v1/ROLLBACK_COPY.tsx}"
git -C "$repo" show HEAD:src/components/cloud/cloud-shell.tsx > "$target"
if grep -q 'href="/app/data"' "$target"; then
  echo "ROLLBACK_FAIL: data navigation remains"
  exit 1
fi
echo "ROLLBACK_PASS: baseline navigation restored"

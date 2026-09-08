#!/usr/bin/env bash
set -euo pipefail
root="${1:-$(pwd)}"
git -C "$root" checkout HEAD -- src/app/globals.css src/components/cloud/cloud-shell.tsx
rm -rf "$root/src/app/app/reports"
rm -f "$root/src/components/cloud/reports-view.tsx" "$root/src/lib/cloud/report-input.ts" "$root/src/lib/cloud/report-metrics.ts" "$root/src/lib/server/report-queries.ts" "$root/tests/unit/reports.test.ts"

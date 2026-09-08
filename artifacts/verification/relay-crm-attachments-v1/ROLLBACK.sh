#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
TARGET="${1:?Pass the config copy to restore}"
EXPECTED='6c74c61347e87c0dedfb9e14f43395221163958af9a0112a2f6cec1191b874db'
ACTUAL="$(sha256sum -- "$TARGET" | cut -d ' ' -f1)"
[ "$ACTUAL" = "$EXPECTED" ] || { printf 'Config differs; not overwritten\n'; exit 2; }
cp -- "$DIR/BASELINE.config.ts" "$TARGET"
[ "$(sha256sum -- "$TARGET" | cut -d ' ' -f1)" = '614bce25b089c3f19b1e17a6346c74b858034040154c6621e7d35303004767cc' ]
printf 'ROLLBACK PASS: original config restored (default 1 MB Server Action limit)\n'

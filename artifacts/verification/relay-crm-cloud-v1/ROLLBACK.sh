#!/usr/bin/env bash
set -euo pipefail
base="4e1647a6925087a31b7e3f1826cdb188a64b4bb9"
if [[ $# -ne 1 ]]; then echo "usage: ROLLBACK.sh TARGET" >&2; exit 2; fi
target="$(cd "$1" && pwd)"
case "$(basename "$target")" in rollback-fixture-*) ;; *) echo "target rejected" >&2; exit 3;; esac
[[ -f "$target/.relay-crm-rollback-target" ]] || { echo "marker missing" >&2; exit 4; }
cd "$target"
git cat-file -e "${base}^{commit}"
git reset --hard "$base" >/dev/null
git clean -fd -e .relay-crm-rollback-target >/dev/null
head="$(git rev-parse HEAD)"
echo "ROLLBACK=PASS commit=$head state=cloud-auth-absent/local-demo-retained"
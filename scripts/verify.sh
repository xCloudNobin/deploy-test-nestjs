#!/usr/bin/env bash
# Full verification for the NestJS taskboard fixture:
#
#   1. clean install  -> rm -rf node_modules && npm ci (frozen lockfile)
#   2. build          -> scripts/build.sh (writes VERSION + nest build -> dist)
#   3. typecheck      -> tsc --noEmit (strict)
#   4. vitest e2e     -> npm run test:e2e (CRUD, search/filter, validation
#      negatives, seed idempotency, restart persistence, database-unavailable
#      readiness via @nestjs/testing + supertest)
#   5. smoke          -> scripts/smoke.sh (real production process:
#      liveness/readiness, CRUD, release marker, restart persistence,
#      database-unavailable readiness 503 and recovery)
#
# Usage:
#   scripts/verify.sh
#
# Exit codes: 0 = all checks passed, nonzero = a check failed. The first
# failing step aborts with its own nonzero code.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE="${NODE:-$(command -v node)}"
NPM="${NPM:-$(command -v npm)}"
[ -x "$NODE" ] || { echo "node executable not found" >&2; exit 1; }
[ -x "$NPM" ] || { echo "npm executable not found" >&2; exit 1; }

step() { printf '\n=== %s ===\n' "$*"; }

step "clean install with frozen lockfile"
rm -rf "$ROOT/node_modules"
(cd "$ROOT" && "$NPM" ci --no-audit --no-fund)

step "build release marker + production bundle"
(cd "$ROOT" && "$NPM" run --silent build)

step "strict typecheck (tsc --noEmit)"
(cd "$ROOT" && "$NPM" run --silent typecheck)

step "vitest e2e suite (test/*.spec.ts, @nestjs/testing + supertest)"
(cd "$ROOT" && "$NPM" run --silent test:e2e)

step "production smoke: real process + CRUD + negatives + persistence + readiness"
"$ROOT/scripts/smoke.sh"

step "verification complete (all steps passed)"
printf '%s\n' "node: $("$NODE" --version)"
printf '%s\n' "npm: $("$NPM" --version)"
printf '%s\n' "nest: $(cd "$ROOT" && npx nest --version 2>/dev/null || echo n/a)"
printf '%s\n' "typeorm: $(cd "$ROOT" && node -p "JSON.parse(require('fs').readFileSync('node_modules/typeorm/package.json','utf8')).version")"
printf '%s\n' "better-sqlite3: $(cd "$ROOT" && node -p "JSON.parse(require('fs').readFileSync('node_modules/better-sqlite3/package.json','utf8')).version")"
printf '%s\n' "release marker: $(cat "$ROOT/VERSION")"
# Commit 3 — Sandboxed SQL Harness: Implementation Plan

**Goal:** `runChallenge(spec)` executes a compiled SQL challenge (setup DDL+seed, reference solution, tests) in an ephemeral in-memory SQLite instance and rejects any challenge whose own tests fail — execution is ground truth, wired into CI as a named executability step.

**Decisions (logged to decision-log.md):**
- **Engine: `better-sqlite3`** over `@duckdb/node-api` — synchronous API (clean ephemeral lifecycle, no async pool), battle-tested native module, window functions since SQLite 3.25 cover analyst-level SQL. DuckDB revisit-able post-hackathon if challenges need heavy analytics SQL.
- **Placement:** `src/harness/` is Node-native by nature → **excluded from the isomorphic src guard program** (tsconfig `exclude`), covered by the test program (node types). **Not exported from the barrel** — subpath export `@dryrun/core/harness` so `web/` bundling never sees the native dep. The no-Node-builtins law now reads: applies to barrel-exported src (schemas/parsers/diff); harness is the sanctioned Node-only zone.
- **Native dep build scripts:** pnpm blocks postinstall by default → `pnpm.onlyBuiltDependencies: ["better-sqlite3"]` in root package.json (CI frozen-lockfile safe).

**Contracts (schemas/ — isomorphic, Vedika renders challenges):**
- `ChallengeTest { name, sql, expectedRows: Record<string, string|number|null>[], ordered }`
- `ChallengeSpec { id, gapId, title, prompt, setupSql, referenceSql, tests (min 1) }` — `gapId` is the receipt chain: challenge → gap → JD/resume spans.
- `ChallengeRunResult { challengeId, passed, failures: [{ test, reason, expected?, actual? }] }`
- Harness guard: at least one test's `sql` must be exactly `referenceSql` (a challenge whose reference solution is untested doesn't ship) → `HarnessError` otherwise.

**Runner semantics:** fresh `Database(":memory:")` per run; `exec(setupSql)`; each test `prepare(sql).all()`; unordered comparison canonicalizes row order (JSON key-stable stringify sort); SQL errors → failure entries, never throws past the boundary; `finally { db.close() }`. Sandbox honesty note in code: inputs are self-compiled challenges at this stage; candidate-submitted SQL (mock mode) needs real hardening — post-hackathon file.

**Tests (`test/harness.test.ts`):** green spec passes; wrong expectedRows → failure with expected/actual; SQL syntax error in a test → failure with reason; missing reference-test → HarnessError; unordered comparison accepts permuted rows; ordered rejects them; db lifecycle (two runs don't share state). Fixture: `test/fixtures/challenge-01.json` — weekly-retention SQL challenge traceable to pair-1's SQL gap.

**CI:** named step "Challenge executability" → `pnpm --filter @dryrun/core test:executability` (`vitest run test/harness.test.ts`) — deliberate re-run of the harness suite as its own visible gate.

**Verification:** unit suite green without key; typecheck (src guard excl. harness + test program incl. harness) green; probe re-check of the src guard; `next build` green (harness not in barrel); CI green on PR.

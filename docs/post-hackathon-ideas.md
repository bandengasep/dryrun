# Post-hackathon ideas

Parking lot for ideas that are **out of scope until 31 Jul 2026** (see the cut list in
`AGENTS.md` → "Ground rules"). Capture here, unevaluated — do not build.

- **Sandbox hardening for candidate-submitted SQL** (referenced from `src/harness/index.ts`) —
  today the harness only executes self-compiled challenge specs; before mock mode ever runs a
  candidate's SQL it needs real isolation (statement allowlist / resource+time limits / worker
  process). Deliberately not built now.
- **DuckDB revisit** — chosen better-sqlite3 (21 Jul) for the sync ephemeral lifecycle; revisit
  `@duckdb/node-api` only if challenge SQL outgrows SQLite (heavy window/analytics workloads).
- **Route-level HTTP contract tests** for `/api/compile` (400-validation, error shape) — core
  logic is covered in `packages/core`; the thin route layer is pinned nowhere.
- **CI guard: `.env.example` must stay placeholder-only** — one grep step failing `verify` if any
  var in the template carries a value (belt on top of GitHub push protection).

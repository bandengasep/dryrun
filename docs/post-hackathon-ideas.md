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
- **SQL Challenge Compiler tier** (parked 26 Jul with the pivot) — the harness + CI executability
  gate are built and green; the missing piece is the generator (Gap → ChallengeSpec). Natural next
  rung after the rehearsal product: concrete technical gaps get an execution-verified drill
  alongside their interview questions (three-tier proof: executed > cited > silent).
- **GMI Cloud provider lane** — OpenAI-compatible (`api.gmi-serving.com/v1`), open-weight models;
  parked 26 Jul for lack of a key. Would extend the provider-comparison evals.
- **LinkedIn import** — runtime scraping verified infeasible (persistent browser session; ToS ban
  risk). Legitimate future shapes: public-ATS URL import (Greenhouse/Lever/Ashby), or a browser
  extension reading the page in the user's own session. Dev-side MCP scraping for fixtures is fine today.
- **Whole-session recording + highlight reel** (VideoDB) — record the full mock, auto-cut a
  "moments to rework" reel from debrief quotes' timestamps.
- **Voice-only answer rung** — STT for spoken answers without camera; superseded this week by the
  video rung, cheaper to add later once transcripts are the debrief substrate.

# Design: All-TypeScript monorepo (stack relock)

**Date:** 2026-07-13 · **Decision owner:** Timothy · **Status:** Approved, implemented at bootstrap

## Decision

Drop the split stack (Python/FastAPI backend + TypeScript/Next.js frontend) locked on
12 Jul. Build DryRun as a single **all-TypeScript pnpm monorepo**. Decided the day after
Phase 0 bootstrap, before any feature code — switch cost was ~zero (a smoke test and empty
package stubs).

## Why

- **The builder is Claude, not a human.** Human Python-vs-TS fluency — the usual decider on
  a deadline — is neutral here. So the choice reduces to architecture merit.
- **DryRun *is* a typed-receipts pipeline.** JD line → resume line → gap → challenge/question,
  every hop carrying receipts. One language lets the receipts contract be a **single shared
  Zod schema** that drives (a) OpenAI's strict structured-output format, (b) the API response
  types, and (c) Vedika's React props. The contract becomes compiler-enforced — the exact
  freeze-and-handoff risk CLAUDE.md flags at commit 2 disappears (no Pydantic↔TS drift).
- **One deploy target** (Vercel) instead of two.

Rejected alternatives: **keep the split** (reintroduces the schema-translation seam at the
product's core); **all-Python** (non-starter — the frontend is desktop-native React, Vedika's lane).

## Verified before committing (not from memory)

- **OpenAI strict structured outputs — parity in TS.** `openai.responses.parse({ text: { format:
  zodTextFormat(Model, "name") } })` → typed `output_parsed`, with refusal handling. Zod is the
  schema language (also `chat.completions.parse` + `zodResponseFormat`). Source: developers.openai.com.
- **SQL sandbox in Node — solid.** `@duckdb/node-api` (`connection.run` / `runAndReadAll`,
  parameterized) and `better-sqlite3`. Test runner: **vitest** (replaces pytest). "Execution is
  ground truth" holds.
- **Supabase + pgvector** — first-class `@supabase/supabase-js`.

## Architecture

```
packages/core/     framework-agnostic TS library (Timothy)
  src/schemas/     Zod — the shared contract (single source of truth)
  src/parsers/     OpenAI responses.parse + zodTextFormat
  src/diff/        embedding match + LLM adjudication → typed set-difference
  src/harness/     SQL sandbox (better-sqlite3 / @duckdb/node-api) + vitest
  src/evals/       precision, Jaccard, citation-validity, cost/latency, baseline
web/               Next.js (App Router, Vedika). Thin route handlers import @dryrun/core;
                   components import the SAME Zod-inferred types. One Vercel deploy.
```

- **Toolchain:** pnpm workspace, Node 22 LTS, TypeScript pinned to 5.x (TS 7 too fresh for a
  deadline), vitest. `pnpm-lock.yaml` committed for reproducible CI. pnpm v11 gates native build
  scripts via `allowBuilds` (sharp allowed).
- **Sandbox placement:** native modules added at the harness commit; runs on the Node.js runtime
  (`export const runtime = "nodejs"`) inside route handlers / vitest — never Edge.
- **CI:** `.github/workflows/ci.yml`, single `verify` job — `pnpm install --frozen-lockfile` →
  core typecheck (tsc) → core vitest → `next build`. Actions: `checkout@v7`, `pnpm/action-setup@v6`,
  `setup-node@v6` (moving tags verified to resolve).

## Consequences

- Python `api/` scaffold deleted; CLAUDE.md Stack / Build-order / Layout rewritten for TS;
  decision-log records the reversal.
- Build order unchanged in shape (schemas → diff → harness → evals), retargeted to Zod / openai-node
  / vitest. Bootstrap `Gap` / `RequirementLine` / `ResumeLine` schemas already live in `packages/core`.
- **Branch protection:** the required status check (once added) must reference the new job name
  **`verify`**, not the retired `api — uv sync + pytest`.

## Verification (local, before push)

- `pnpm --filter @dryrun/core typecheck` — clean.
- `pnpm --filter @dryrun/core test` — 3/3 (the `Gap` receipts contract validates).
- `pnpm --filter web build` — compiles; the cross-package `@dryrun/core` type import resolves,
  proving the shared contract flows backend → frontend.

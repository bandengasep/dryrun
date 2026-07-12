# DryRun — the interview compiler

[![CI](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml/badge.svg)](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml)

> Paste a job description and a resume; DryRun diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles a personalized interview environment: executable SQL challenges and behavioral questions, each traceable to the gap that produced it.

**Hackathon submission — deadline 31 Jul 2026, 23:59 SGT.** Public repo + ≤3-min video + ≤1,000-word write-up. Judged on five pillars: Problem · Approach · Evidence · Constraints · Honesty & Trajectory. Guiding rule: *a modest claim, proven, beats a grand claim, asserted.*

**Team:** Timothy (backend / agents / evals) · Vedika (UI/UX / video).

## Stack

All-TypeScript **pnpm workspace** (Node 22, TypeScript 5.x). One language across backend and frontend so the receipts contract is a single shared type — Zod schemas in `packages/core` drive OpenAI's strict structured output, the API types, and the React props alike. Runtime models: **OpenAI only**. Data: Supabase + pgvector. Sandbox: `better-sqlite3` / `@duckdb/node-api` + vitest.

## Layout

```
packages/core/          # backend TS library (Timothy)
  src/schemas/          # Zod — THE shared receipts contract (single source of truth)
  src/parsers/          # OpenAI responses.parse + zodTextFormat
  src/diff/             # embedding match + LLM adjudication → typed set-difference
  src/harness/          # SQL sandbox: better-sqlite3 / @duckdb/node-api + vitest
  src/evals/            # precision, Jaccard, citation-validity, cost/latency, baseline
web/                    # Next.js (App Router) — Vedika's lane; imports @dryrun/core types
docs/                   # spec.md, decision-log.md, post-hackathon-ideas.md
.github/workflows/      # ci.yml — pnpm install + typecheck + vitest + next build
```

## Getting started

```bash
pnpm install
pnpm --filter @dryrun/core test    # vitest (the shared-contract tests)
pnpm --filter web dev              # http://localhost:3000
pnpm typecheck                     # tsc across all packages
```

## Docs

- `docs/spec.md` — full product spec
- `docs/decision-log.md` — dated architecture / scope decisions
- `CLAUDE.md` — operational guide (build order, cut list, locked stack)

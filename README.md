# DryRun — the interview compiler

[![CI](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml/badge.svg)](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml)

> Paste a job description and a resume; DryRun diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles a personalized interview environment: executable SQL challenges and behavioral questions, each traceable to the gap that produced it.

**Hackathon submission — deadline 31 Jul 2026, 23:59 SGT.** Public repo + ≤3-min video + ≤1,000-word write-up. Judged on five pillars: Problem · Approach · Evidence · Constraints · Honesty & Trajectory. Guiding rule: *a modest claim, proven, beats a grand claim, asserted.*

**Team:** Timothy (backend / agents / evals) · Vedika (UI/UX / video).

## Stack

All-TypeScript **pnpm workspace** (Node 22, TypeScript 5.x). One language across backend and frontend so the receipts contract is a single shared type — Zod schemas in `packages/core` drive OpenAI's strict structured output, the API types, and the React props alike. Runtime models: **OpenAI only**. Data: Supabase + pgvector. Sandbox: `better-sqlite3` + vitest — a compiled challenge ships only if its own tests execute green.

## Status (21 Jul)

| Piece | State |
|---|---|
| JD / resume parsers — strict structured outputs, receipts computed by a deterministic locator (never trusted from the model); unlocatable quotes surface in `dropped` | ✅ shipped, live-tested |
| Gap diff engine — embedding match + one batched adjudication → *missing / weak evidence / strong differentiator*, every row carrying JD + resume spans | ✅ shipped, live-green on 3 hand-built fixture pairs |
| `/api/compile` — runs the real pipeline end to end | ✅ shipped |
| SQL challenge harness — ephemeral sandbox; a challenge whose own tests fail cannot ship (CI-enforced) | 🔄 PR #7 |
| pgvector persistence · challenge compiler · behavioral compiler · eval suite | ⏳ next |

The invariant everything hangs on: `sourceText.slice(span.start, span.end) === span.text` — every gap receipt is a literal slice of the submitted documents, enforced by code.

## Layout

```
packages/core/          # backend TS library (Timothy)
  src/schemas/          # Zod — THE shared receipts contract (single source of truth)
  src/parsers/          # OpenAI responses.parse + zodTextFormat
  src/diff/             # embedding match + LLM adjudication → typed set-difference
  src/harness/          # SQL sandbox: ephemeral better-sqlite3 (import via @dryrun/core/harness)
  src/evals/            # precision, Jaccard, citation-validity, cost/latency, baseline
web/                    # Next.js (App Router) — Vedika's lane; imports @dryrun/core types
docs/                   # spec.md, decision-log.md, post-hackathon-ideas.md
.github/workflows/      # ci.yml — pnpm install + typecheck + vitest + next build
```

## Getting started

```bash
pnpm install
cp .env.example .env               # fill in OPENAI_API_KEY (live suites + compile route)
pnpm --filter @dryrun/core test    # vitest — live suites self-skip without a key (CI runs keyless)
pnpm --filter web dev              # http://localhost:3000 (route reads web/.env.local)
pnpm typecheck                     # tsc across all packages
```

## Docs

- `docs/spec.md` — full product spec
- `docs/decision-log.md` — dated architecture / scope decisions
- `AGENTS.md` — operational guide (build order, cut list, locked stack); `CLAUDE.md` imports it

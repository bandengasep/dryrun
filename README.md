# DryRun — rehearse the interview you're about to have

[![CI](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml/badge.svg)](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml)

> Paste a job description and a resume; DryRun diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles **your interview**: the questions those gaps predict, rehearsed live against an AI interviewer, debriefed with feedback that quotes your own answers back to you. Nothing displayed without a receipt; nothing graded, everything cited. *(Pivoted 26 Jul from the executable-SQL-challenge surface — decision log has the reasoning; the SQL harness stays in-repo, dormant and CI-green.)*

**Hackathon submission — deadline 31 Jul 2026, 23:59 SGT.** Public repo + ≤3-min video + ≤1,000-word write-up. Judged on five pillars: Problem · Approach · Evidence · Constraints · Honesty & Trajectory. Guiding rule: *a modest claim, proven, beats a grand claim, asserted.*

**Team:** Timothy (backend / agents / evals) · Vedika (UI/UX / video).

## Stack

All-TypeScript **pnpm workspace** (Node 22, TypeScript 5.x). One language across backend and frontend so the receipts contract is a single shared type — Zod schemas in `packages/core` drive OpenAI's strict structured output, the API types, and the React props alike. LLM providers: **OpenAI + Agnes AI** (OpenAI-compatible, wired through the same client-injection seam). Video answers: **VideoDB** (direct upload → timed transcripts). **Almost no database** — in-flight session state is client-held and routes are stateless; the single server-side write is the explicit "Save & share debrief" button (one `sessions` row, read back only through our own server). Dormant sandbox: `better-sqlite3` + vitest harness with its CI gate (the parked SQL-challenge tier).

## Status (26 Jul — post-pivot)

| Piece | State |
|---|---|
| JD / resume parsers — strict structured outputs, receipts computed by a deterministic locator (never trusted from the model); unlocatable quotes surface in `dropped` | ✅ shipped, live-tested |
| Gap diff engine — embedding match + one batched adjudication → *missing / weak evidence / strong differentiator*, every row carrying JD + resume spans | ✅ shipped, live-green on 3 hand-built fixture pairs |
| `/api/compile` — runs the real pipeline end to end | ✅ shipped (SSE trace rewrite this week) |
| SQL challenge harness + CI executability gate | ✅ shipped, dormant (generator parked post-hackathon) |
| Session-plan compiler (receipt-carrying interview questions) · mock session (Agnes/OpenAI interviewer) · debrief (transcript-quoted feedback, no scores) · video answers (VideoDB, gated) · eval suite | ⏳ this week — see `docs/superpowers/plans/2026-07-26-pivot-interview-rehearsal.md` |

The invariant everything hangs on: `sourceText.slice(span.start, span.end) === span.text` — every gap receipt is a literal slice of the submitted documents, enforced by code.

## Layout

```
packages/core/          # backend TS library
  src/schemas/          # Zod — THE shared receipts contract (single source of truth)
  src/parsers/          # OpenAI responses.parse + zodTextFormat; deterministic span locator
  src/diff/             # embedding match + LLM adjudication → typed set-difference
  src/plan|session|debrief/  # this week: question compiler, interviewer protocol, cited debrief
  src/harness/          # dormant SQL sandbox (import via @dryrun/core/harness)
  src/evals/            # metric implementations (stub today; built with the features this week)
web/                    # Next.js (App Router); imports @dryrun/core
docs/                   # spec-pivot-2026-07-26.md, decision-log.md, post-hackathon-ideas.md
.github/workflows/      # ci.yml — pnpm install + typecheck + vitest + harness gate + next build
```

## Getting started

```bash
# 1 — Toolchain. Node 22+ (see .nvmrc) and the pinned pnpm.
node -v                            # must be >= 22; `nvm use` picks it up from .nvmrc
corepack enable                    # installs the pinned pnpm 11.5.1

# 2 — Get the current code.
#     `git fetch` alone updates refs but NOT your files. You need the pull.
git checkout main && git pull

# 3 — Install. Re-run after every pull: dependencies change.
pnpm install

# 4 — Keys. The web app reads web/.env.local.
#     A root .env is NOT read by Next.js and will not make the app work.
cp .env.example web/.env.local     # then fill in OPENAI_API_KEY (+ AGNES_API_KEY)
cp .env.example .env               # separate copy, only for packages/core live tests

# 5 — Run.
pnpm --filter web dev              # http://localhost:3000
pnpm --filter @dryrun/core test    # vitest — live suites self-skip without a key
pnpm typecheck                     # tsc across all packages
```

### If it doesn't run

| Symptom | Cause | Fix |
|---|---|---|
| Pages look old / missing `/plan` | You fetched but never merged, or you're on a stale branch (`vedika` and `dryrun-FE-V0` are dozens of commits behind and are **not** updated) | `git checkout main && git pull` |
| `Cannot find module 'pdfjs-dist'` (or `mammoth`, `@supabase/supabase-js`) | New dependencies landed in a commit you just pulled | `pnpm install` |
| App loads, but compiling returns *"Missing credentials … OPENAI_API_KEY"* | No `web/.env.local` — this is the most common one, and a root `.env` does not fix it | step 4 above |
| `pnpm: command not found` | pnpm not on PATH | `corepack enable` |
| Unsupported-engine or syntax errors on startup | Node older than 22 | `nvm install 22 && nvm use` |

The app **starts without any keys** — the landing and `/compile` render fine. Only the
model-backed routes fail, so "the site loads but compiling errors" always means keys.

## Docs

- `docs/spec-pivot-2026-07-26.md` — product spec + pre-committed success criteria (`docs/spec.md` is the pre-pivot history)
- `docs/superpowers/plans/2026-07-26-pivot-interview-rehearsal.md` — the full final-week execution plan
- `docs/decision-log.md` — dated architecture / scope decisions (the pivot's reasoning lives here)
- `AGENTS.md` — operational guide (build order, cut list, providers, ground rules); `CLAUDE.md` imports it

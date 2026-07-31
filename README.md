# DryRun — rehearse the interview you're about to have

[![CI](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml/badge.svg)](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml)

> Paste a job description and a resume; DryRun diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles **your interview**: the questions those gaps predict, rehearsed live against an AI interviewer, debriefed with feedback that quotes your own answers back to you. Nothing displayed without a receipt; nothing graded, everything cited. *(Pivoted 26 Jul from the executable-SQL-challenge surface — decision log has the reasoning; the SQL harness stays in-repo, dormant and CI-green.)*

**Hackathon submission — deadline extended to Sun 2 Aug 2026 (announced 30 Jul); submitting Sat 1 Aug evening.** Public repo + ≤3-min video + ≤1,000-word write-up with the five pillars as section headings: Problem · Approach · Evidence · Constraints · Honesty & Trajectory. Guiding rule: *a modest claim, proven, beats a grand claim, asserted.* Video + write-up links land here before submission.

**Team:** Timothy (backend / agents / evals) · Vedika (UI/UX / video).

## Stack

All-TypeScript **pnpm workspace** (Node 22, TypeScript 5.x). One language across backend and frontend so the receipts contract is a single shared type — Zod schemas in `packages/core` drive OpenAI's strict structured output, the API types, and the React props alike. LLM providers: **OpenAI + Agnes AI** (OpenAI-compatible, wired through the same client-injection seam). Video answers: **VideoDB** (direct upload → timed transcripts). **Almost no database** — in-flight session state is client-held and routes are stateless; the single server-side write is the explicit "Save & share debrief" button (one `sessions` row, read back only through our own server). Dormant sandbox: `better-sqlite3` + vitest harness with its CI gate (the parked SQL-challenge tier).

## Status (30 Jul)

**Live at [dryrun-web-pi.vercel.app](https://dryrun-web-pi.vercel.app)** — the whole journey, E2E-verified with real API calls.

| Piece | State |
|---|---|
| Full pipeline: compile (SSE trace) → plan (receipt-carrying questions) → session room (Agnes interviewer, labeled OpenAI failover) → debrief (transcript-quoted, no scores) | ✅ shipped, live |
| Ingest, both columns: paste / .txt / .md / .docx / .pdf / screenshot — extraction lands as an editable draft, the user confirms before compile (vision is never the source of record) | ✅ shipped |
| Save & share debrief — the one explicit server-side write; read-only link, write-once | ✅ shipped |
| `?mock=1` offline demo mode | ✅ shipped |
| Langfuse observability — masked prod traces, versioned prompts, eval suites push scores | ✅ shipped |
| Eval suite + banked results | ✅ `evals/results/` — see Evidence below |
| SQL challenge harness + CI executability gate | dormant, CI-green (parked tier) |
| Video answers (VideoDB timed transcripts) | **no-go at the pre-committed gate** — substrate ships dormant (14 passing timeline tests); debrief loses only timestamps |

The invariant everything hangs on: `sourceText.slice(span.start, span.end) === span.text` — every gap receipt is a literal slice of the submitted documents, enforced by code.

## Evidence — every locked criterion, measured

Success criteria were locked **before building** (`docs/spec-pivot-2026-07-26.md`, 26 Jul). Every criterion appears below — met, missed, or restated; none silently dropped. Misses follow the pre-committed policy: restate with the measurement rather than quietly re-baseline.

**Engine note (31 Jul):** the structured lane was upgraded to `gpt-5.6-luna` two days before submission — adopted **only after** it passed the same locked gates (consistency Jaccard 0.881/0.770, pre-guard grounding 30/30 — `evals/results/*gpt-5.6-luna*`), under a disclosed policy revision from "gold gate or restate" to "mechanical-evidence gate" (decision-log 2026-07-31). The faster option we refused the same night: lowering reasoning effort cut latency 4× but collapsed requirement extraction — speed bought by reading less of the JD (`latency-program-2026-07-31.json`).

| Criterion | Target (locked 26 Jul) | Measured | Verdict |
|---|---|---|---|
| Displayed-question grounding | 100% by construction; pre-guard ≥95% | Pre-guard **29/29 (100%)** across 5 pairs; displayed rate guard-enforced (unknown `gapId` throws) — `evals/results/grounding-2026-07-28.json` | **Met** |
| Displayed debrief quotes valid | 100% by construction; dropped <10% | Live session: every quote slices back to the candidate's own turn, **0 dropped** (single live session, disclosed); failures demote to a visible `dropped[]`, never displayed | **Met** |
| Gap-set consistency | mean pairwise Jaccard ≥0.6 (20 runs/pair) | **0.794** (pair-01, 20/20 runs) · **0.900** (pair-04, 18/20; 2 runs guard-rejected) — `consistency-2026-07-28.json`. Adopted engine: **0.881** / **0.770** (pair-04: 3/20 rejected, disclosed) — `consistency-gpt-5.6-luna-2026-07-31.json` | **Met** (2 pairs, both engines) |
| Gap precision / recall vs gold | ≥0.8 / ≥0.7, human-adjudicated | **Not measured — descoped 30 Jul** (adjudicator ill; AI adjudication declined twice on circularity — decision log). Protocol, grouped review sheets, and strict taxonomy validation are committed and CI-green in `test/gold/`; corpus reached 5 pairs, not the spec table's 13 | **Restated** (first post-deadline task) |
| Cost | compile ≤$0.05 · session ≤$0.25 median | **Not captured** — cost threading in the eval suites nulls out (logged 29 Jul); Agnes publishes no per-token price, and we report tokens rather than invent one. Derived, labeled as such: **≈$0.035/compile** from banked token counts × the adopted model's posted $1/$6 rate | **Restated** |
| Latency: compile p50 | ≤60s | **16.6–19.1s** fixture · **40–45s** real Venture JD, production 31 Jul on the gate-adopted engine (was 99.65s / 146.3s). Disclosed: ~1-in-5 runs on the rejection-prone fixture fail loud at the citation guard; the route retries once, announced in the SSE trace | **Met** (n=3+2 prod runs, not a long-run p50) |
| Latency: plan | ≤20s | **9.4–11.0s** production 31 Jul (was 33.4s). The Agnes lane (**13.2s at receipts parity**, 2.40× vs the old lane) ships built and labeled behind `PLAN_PROVIDER`, default off — the comparison exhibit stands | **Met** |
| Latency: first turn token | ≤3s | **6.9–9.2s** prod after a 41% prompt trim (was ~6.2s) — partner-gateway-bound, not prompt-bound; the Agnes interviewer lane is kept deliberately for the labeled provider exhibit | **Missed — restated** |
| Latency: debrief | ≤45s | **6.9s** production 31 Jul, 4/4 quotes mechanically slice-valid, 0 dropped (**22.7s** baseline, live 2-question session) | **Met** |
| Video quote→timestamp | ≥90% exact | Lane **no-go'd at the pre-committed Wed 15:00 gate, called 14h early on evidence**; substrate ships dormant with 14 passing timeline tests (exact arithmetic by construction, unexercised in product) | **Restated** (the gate working as designed) |
| Zero-shot baseline uncited-rate | reported side-by-side | **Reported: 1.03%** (28 Jul) · **0.0%** (30 Jul audited re-run: 100/100 quotes verbatim, median 91 chars, full parse coverage) — `baseline-2026-07-30.json` | **Met** — and it did not show what we expected (see below) |

**On the baseline:** we built it expecting fabricated quotes; measured, gpt-5-mini quotes verbatim essentially always when politely asked. We report that unflattering result instead of burying it, because it sharpens the actual claim: the baseline's citedness is a *habit with no enforcement* (the 28-Jul run did fabricate once, and nothing would ever catch the day it does), its quotes are unanchored strings a reader cannot verify without exactly the locator machinery this product ships, and verifying the baseline's 0% *required* that machinery. DryRun's claim was never "models can't quote" — it's that **nothing is displayed without a mechanically validated receipt, and validation failures are shown, not hidden**.

**Provider exhibit (Constraints/Approach):** on plan-compile, Agnes (`agnes-2.0-flash`, `chat.completions` + `json_schema`) ran **2.40× faster than OpenAI at receipts parity** — 13.2s vs 31.6s mean, grounding 12/12 on both, STAR compliance 100% on both (n=2 pairs) — `provider-comparison-2026-07-28.json`.

## Layout

```
packages/core/          # backend TS library
  src/schemas/          # Zod — THE shared receipts contract (single source of truth)
  src/parsers/          # OpenAI responses.parse + zodTextFormat; deterministic span locator
  src/diff/             # embedding match + LLM adjudication → typed set-difference
  src/plan|session|debrief/  # this week: question compiler, interviewer protocol, cited debrief
  src/harness/          # dormant SQL sandbox (import via @dryrun/core/harness)
  src/evals/            # metric implementations (pure, offline-tested); keyed runner in test/evals/
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

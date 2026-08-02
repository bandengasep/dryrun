# DryRun — rehearse the interview you're about to have

[![CI](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml/badge.svg)](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml)

> Paste a job description and a resume. DryRun diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles **your interview**: the questions those gaps predict, rehearsed live against an AI interviewer, debriefed with feedback that quotes your own answers back to you. Nothing displayed without a receipt; nothing graded, everything cited.

The invariant everything hangs on: **`sourceText.slice(span.start, span.end) === span.text`** — every receipt is a literal slice of the submitted documents, enforced by code, not by prompt.

**🔗 Live on Vercel: [dryrun-web-pi.vercel.app](https://dryrun-web-pi.vercel.app)** — no account, no setup. No API keys either: [run the offline demo](https://dryrun-web-pi.vercel.app/compile?mock=1) (`?mock=1`).

**▶ [3-minute demo video](https://www.youtube.com/watch?v=1hBnwopwlEo)** (2:43) · **[Submission write-up](docs/submission/write-up.md)** · **Team LyonAI:** Timothy (backend / agents / evals), Vedika (UI/UX / video)

*Pivoted 26 Jul from an executable-SQL-challenge product — reasoning in [`docs/decision-log.md`](docs/decision-log.md); that tier stays in-repo, dormant and CI-green.*

## What ships

| Piece | State |
|---|---|
| Full pipeline: compile (SSE trace) → plan (receipt-carrying questions) → session room (Agnes interviewer, labeled OpenAI failover) → debrief (transcript-quoted, no scores) | ✅ live |
| Ingest, both columns: paste / .txt / .md / .docx / .pdf / screenshot — extraction lands as an editable draft the user confirms; vision is never the source of record | ✅ live |
| Save & share debrief — the one server-side write; write-once, read-only link | ✅ live |
| `?mock=1` offline demo mode | ✅ live |
| Langfuse observability — masked prod traces, versioned prompts, eval suites push scores | ✅ live |
| Eval suite + banked results | ✅ `evals/results/` — see Evidence |
| SQL challenge harness + CI executability gate | dormant, CI-green (parked tier) |
| Video answers (VideoDB timed transcripts) | no-go at the pre-committed gate — substrate dormant (14 passing timeline tests); debrief loses only timestamps |

## Repository guide

Where to look, and what each file proves:

| Path | What it contains | What it demonstrates |
|---|---|---|
| [`packages/core/src/parsers/spans.ts`](packages/core/src/parsers/spans.ts) | `locateSpan`, the deterministic span locator | The one mechanical anchor behind every receipt — gaps, questions, and debrief quotes all pass through it |
| [`packages/core/src/schemas/`](packages/core/src/schemas) | Zod schemas — the receipts contract | A single typed contract driving OpenAI strict structured output, the API, and the React props |
| [`packages/core/src/plan/shared.ts`](packages/core/src/plan/shared.ts) | Plan-compiler grounding guards | A question citing an unknown `gapId` throws before render — displayed grounding is 100% by construction |
| [`packages/core/src/debrief/index.ts`](packages/core/src/debrief/index.ts) | Debrief compiler | Quotes that fail mechanical validation demote to a visible `dropped[]` — shown, never silently discarded |
| [`packages/core/src/evals/index.ts`](packages/core/src/evals/index.ts) | Metric implementations: grounding rate, Jaccard, uncited-rate, cost, the gold taxonomy validator | The Evidence numbers below, as plain offline-testable functions |
| [`packages/core/test/evals/harness.ts`](packages/core/test/evals/harness.ts) | Keyed eval runner (`RUN_EVALS=1`) | How every banked result was produced: fixture pairing, call metering, result persistence |
| [`evals/results/`](evals/results) | 11 banked result JSONs | The raw runs behind every number in the table below |
| [`packages/core/test/gold/README.md`](packages/core/test/gold/README.md) | Gold adjudication protocol, review sheets, strict taxonomy validation | The unmeasured criterion's machinery — committed and CI-green, waiting on a human adjudicator |
| [`packages/core/src/harness/index.ts`](packages/core/src/harness/index.ts) | SQL challenge harness (ephemeral in-memory SQLite) | The parked pre-pivot tier, dormant and CI-green |
| [`web/app/lib/mock.tsx`](web/app/lib/mock.tsx) | `?mock=1` offline demo | Judgment is faked; citation mechanics are not — spans still satisfy the slice invariant |
| [`web/app/api/`](web/app/api) | Six stateless route handlers | Client-held session state; the single server-side write is the explicit Save & share |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | The `verify` gate | Typecheck → vitest → harness executability → `next build` on every push and PR — what "CI-green" means above |

## Evidence — every locked criterion, measured

Success criteria were locked **before building** ([`docs/spec-pivot-2026-07-26.md`](docs/spec-pivot-2026-07-26.md), 26 Jul). Every criterion is reported — met, missed, or restated; none silently dropped. A miss is restated with its measurement, never quietly re-baselined.

The structured lane runs `gpt-5.6-luna`, adopted 31 Jul only after it passed the same locked gates (Jaccard 0.881/0.770, pre-guard grounding 30/30 — `evals/results/*gpt-5.6-luna*`; policy revision disclosed in the decision log). The faster option we refused that night: lowering reasoning effort cut latency 4× but collapsed requirement extraction — speed bought by reading less of the JD (`latency-program-2026-07-31.json`).

| Criterion | Target (locked 26 Jul) | Measured | Verdict |
|---|---|---|---|
| Displayed-question grounding | 100% by construction; pre-guard ≥95% | **29/29 (100%)** pre-guard across 5 pairs (`grounding-2026-07-28.json`) · **30/30** re-verified on the adopted engine; displayed rate guard-enforced — unknown `gapId` throws | **Met** |
| Displayed debrief quotes valid | 100% by construction; dropped <10% | **0 dropped** — every quote slices back to the candidate's own turn (single live session, disclosed); failures demote to a visible `dropped[]` | **Met** |
| Gap-set consistency | mean pairwise Jaccard ≥0.6 (20 runs/pair) | **0.794** (pair-01, 20/20) · **0.900** (pair-04, 18/20; 2 guard-rejected) · adopted engine **0.881** / **0.770** (3/20 rejected, disclosed) — `consistency-*.json` | **Met** (2 pairs, both engines) |
| Gap precision / recall vs gold | ≥0.8 / ≥0.7, human-adjudicated | **Not measured** — adjudicator ill; AI adjudication declined twice on circularity (decision log). Protocol, review sheets, and taxonomy validation are CI-green in `test/gold/`; corpus at 5 of the spec's 13 pairs | **Restated** (first post-deadline task) |
| Cost | compile ≤$0.05 · session ≤$0.25 median | **≈$0.035/compile**, derived from banked token counts × the adopted model's posted $1/$6 rate and labeled derived — direct capture nulls out in the eval suites, and Agnes publishes no per-token price | **Restated** |
| Latency: compile p50 | ≤60s | **16.6–19.1s** fixture · **40–45s** real Venture JD in production (was 99.65s / 146.3s). ~1-in-5 runs on the rejection-prone fixture fail loud at the citation guard; the route retries once, announced in the SSE trace | **Met** (n=3+2 prod runs, not a long-run p50) |
| Latency: plan | ≤20s | **9.4–11.0s** production (was 33.4s). The Agnes lane — **13.2s at receipts parity**, 2.40× vs the old lane — ships labeled behind `PLAN_PROVIDER`, default off | **Met** |
| Latency: first turn token | ≤3s | **6.9–9.2s** prod after a 41% prompt trim — partner-gateway-bound, not prompt-bound; the Agnes interviewer lane stays for the labeled provider exhibit | **Missed — restated** |
| Latency: debrief | ≤45s | **6.9s** production, 4/4 quotes mechanically slice-valid, 0 dropped (**22.7s** baseline, live 2-question session) | **Met** |
| Video quote→timestamp | ≥90% exact | **No-go** at the pre-committed Wed 15:00 gate, called 14h early on evidence; substrate dormant with 14 passing timeline tests (exact arithmetic by construction, unexercised in product) | **Restated** (the gate working as designed) |
| Zero-shot baseline uncited-rate | reported side-by-side | **1.03%** (28 Jul) · **0.0%** (30 Jul audited re-run: 100/100 quotes verbatim, median 91 chars) — `baseline-2026-07-30.json` | **Met** — not what we expected (below) |

**On the baseline:** we built it expecting fabricated quotes; measured, gpt-5-mini quotes verbatim essentially always when politely asked. We report the unflattering result because it sharpens the claim: the baseline's citedness is a habit with no enforcement (its one 28-Jul fabrication would have shipped undetected), its quotes are unanchored strings a reader cannot verify — and verifying its 0% required exactly the locator machinery DryRun ships. The claim was never "models can't quote"; it is that **nothing is displayed without a mechanically validated receipt, and validation failures are shown, not hidden**.

**Provider exhibit:** on plan-compile, Agnes (`agnes-2.0-flash`, `chat.completions` + `json_schema`) ran **2.40× faster than OpenAI at receipts parity** — 13.2s vs 31.6s mean, grounding 12/12 on both, STAR compliance 100% on both (n=2 pairs) — `provider-comparison-2026-07-28.json`.

## Getting started

Fastest path: the deployed app at **[dryrun-web-pi.vercel.app](https://dryrun-web-pi.vercel.app)** — nothing to install. To run locally:

```bash
# 1 — Toolchain: Node 22+ (see .nvmrc) and the pinned pnpm
node -v                            # must be >= 22
corepack enable                    # installs the pinned pnpm 11.5.1

# 2 — Clone and install
git clone https://github.com/bandengasep/dryrun && cd dryrun
pnpm install

# 3 — Keys: the web app reads web/.env.local (a root .env is NOT read by Next.js)
cp .env.example web/.env.local     # fill in OPENAI_API_KEY (+ AGNES_API_KEY)
cp .env.example .env               # separate copy, only for packages/core live tests

# 4 — Run
pnpm --filter web dev              # http://localhost:3000
pnpm --filter @dryrun/core test    # vitest — live suites self-skip without a key
pnpm typecheck                     # tsc across all packages
```

The app **starts without any keys** — only the model-backed routes need them, and `?mock=1` needs nothing at all.

| Symptom | Fix |
|---|---|
| `Cannot find module 'pdfjs-dist'` (or `mammoth`, `@supabase/supabase-js`) | `pnpm install` after pulling |
| *"Missing credentials … OPENAI_API_KEY"* on compile | Create `web/.env.local` (step 3) — a root `.env` does not fix it |
| `pnpm: command not found` | `corepack enable` |
| Unsupported-engine or syntax errors on startup | Node older than 22 → `nvm install 22 && nvm use` |

## Mocked, incomplete, or external

Stated up front so nothing has to be discovered:

- **Mocked:** `?mock=1` synthesizes plan, session, and debrief client-side with zero network ([`web/app/lib/mock.tsx`](web/app/lib/mock.tsx)); an ochre banner labels every mocked screen. Only judgment is faked — spans are still computed with real `indexOf`, so the slice invariant holds even in the demo.
- **Incomplete / dormant:** gold precision/recall **not measured** (protocol and review sheets committed, CI-green; first post-deadline task) · video-answer lane **no-go'd** at its pre-committed gate (substrate dormant, 14 passing tests) · SQL challenge harness dormant by design (parked tier) · known limitation: the engine over-generates — 168 gaps collapse to 89 distinct JD requirements on our corpus — capped in the UI with a show-all expander; deduplication is the named next step.
- **Accepted keyless-demo constraints** (documented in the decision log, 2 Aug): no rate limiting or size caps on the model-invoking routes, and `/api/session/save` is an unauthenticated write.
- **External services at runtime:** OpenAI (required — structured calls + embeddings) · Agnes AI (interviewer lane; per-request OpenAI failover, labeled in the UI) · Supabase (touched only by the explicit "Save & share" write) · Langfuse (optional observability; prod traces mask JD, resume, and answer bodies) · VideoDB (dormant with the video lane).
- **Secrets:** none in history — `.env` files gitignored, `.env.example` placeholder-only, full-history `gitleaks detect` clean (re-run 2 Aug at `6aca33d`).

## Docs

- [`docs/submission/write-up.md`](docs/submission/write-up.md) — the ≤1,000-word submission write-up (five pillars as section headings)
- [`docs/spec-pivot-2026-07-26.md`](docs/spec-pivot-2026-07-26.md) — product spec + the success criteria locked before building
- [`docs/decision-log.md`](docs/decision-log.md) — dated architecture and scope decisions, including the pivot and every disclosed miss
- [`AGENTS.md`](AGENTS.md) — operational ground rules (receipts law, cut list, provider matrix)

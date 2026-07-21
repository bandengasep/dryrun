# DryRun — the interview compiler

> Paste a job description and a resume; DryRun diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles a personalized interview environment: executable SQL challenges and behavioral questions, each traceable to the gap that produced it.

**Deadline: 31 Jul 2026, 23:59 SGT.** Submission = public repo + ≤3-min video + ≤1,000-word write-up.
**Judged on five pillars** (Problem, Approach, Evidence, Constraints, Honesty & Trajectory), 1–5 each. Master rule: *a modest claim, proven, beats a grand claim, asserted.* Not polish.
**Team:** Timothy (backend / agents / evals) · Vedika (UI/UX / video).
Full product spec lives in `docs/spec.md` (copy of interview-compiler-spec.md). This file is operational — it is the canonical ops doc for **all** agent tooling; `CLAUDE.md` just imports it.

---

## Ground rules (every session)

1. **The cut list is law.** Never build: readiness/aggregate scores, resume rewriting or bullet tailoring, persistent evidence-bank UI, ATS match scores, application tracker, company/competency prediction, answer auto-scoring, graph DBs (NetworkX/Neo4j), Redis, Realtime speech-to-speech. New ideas go to `docs/post-hackathon-ideas.md`, unevaluated, no exceptions until 31 Jul.
2. **Receipts everywhere.** Every gap, question, and claim carries its source spans (JD line ↔ resume line ↔ gap ID). A feature that can't carry receipts doesn't ship.
3. **Execution is ground truth.** A compiled challenge ships only if its own tests pass; CI enforces this.
4. **Runtime = OpenAI only** ($150 hackathon credits). Claude Code is the dev tool; never put Anthropic APIs in the product runtime.
5. **Verify APIs before coding, don't trust memory.** Pull current docs via Context7 (or your tool's docs lookup): the OpenAI **Node** SDK (`/openai/openai-node`, which redirects to `/websites/developers_openai`; structured outputs via `responses.parse` + `zodTextFormat`), `/supabase/supabase`, `/vercel/next.js`, `/websites/pnpm_io`.
6. Ask before adding any dependency not in the stack lock. Log real architecture/scope decisions in `docs/decision-log.md` with date + one-line rationale.
7. **Branch discipline.** Day-to-day work lives on `timothy` and Vedika's FE branches (currently `dryrun-FE-V0`; `vedika` is the older lane branch); nothing lands on `main` except via PR with CI green. Merge to `main` at least daily once real commits exist — `main` must always be demoable. Lanes barely overlap (`packages/core/` vs `web/`), so merges stay cheap; don't let the branches drift for days. (The repo is public, so this is enforced by the `protect-main` ruleset — requires a PR and the `verify` status check — not just convention.)
8. **Secrets:** real values only ever go in `.env` (gitignored). `.env.example` is a tracked, placeholder-only template — never paste a key into it. GitHub push protection is on; `gitleaks` full-history scan runs final week.

## Stack (all-TypeScript monorepo — relocked 13 Jul; mobile retired 12 Jul. See decision log.)

- **Monorepo:** pnpm workspace, Node 22 LTS, TypeScript (pinned 5.x). One language across BE + FE so the receipts contract is a single shared type, not a Pydantic↔TS translation.
- **packages/core/** (Timothy) — framework-agnostic TS library: schemas, parsers, diff, harness, evals. No web framework dependency; `src/` stays free of Node builtins (Node imports allowed in `test/` only).
- **web/** (Vedika) — Next.js (App Router) + React 19; imports `@dryrun/core` types directly. One Vercel deploy for the whole app.
- **Shared contract:** Zod schemas in `packages/core/src/schemas` are the single source of truth — they drive OpenAI's strict output format (`zodTextFormat`), the API response types, and Vedika's component props.
- **Data:** Supabase Postgres + pgvector (`@supabase/supabase-js`). Keys use Supabase's new API-key scheme: server-side uses the **secret key** (`sb_secret_...`, env `SUPABASE_SECRET_KEY`) — the legacy `service_role`/`anon` JWT keys are deprecated (verified via Context7, 21 Jul).
- **Models:** `gpt-5-mini` (fallback `gpt-4.1-mini`) via the OpenAI **Node** SDK with **strict structured outputs** (`responses.parse` + `zodTextFormat`); embeddings `text-embedding-3-small`; prompt caching on repeated JD context. Budget: full eval suite ≪ $150. SDK: `openai@^6` in `packages/core` **and** `web/` (the compile route constructs the client it injects; peer-compatible with our zod 4).
- **Challenge sandbox:** `better-sqlite3` (chosen over `@duckdb/node-api` 21 Jul — sync API, ephemeral `:memory:` lifecycle; window functions cover analyst SQL) + **vitest**. Harness is the sanctioned Node-only zone of core: `src/harness/` is excluded from the isomorphic src guard, not exported from the barrel — import via `@dryrun/core/harness`.

## Layout

```
packages/core/src/{schemas,parsers,diff,harness,evals}/   # backend TS library (Timothy)
packages/core/test/   # vitest; incl. fixtures/ (hand-built JD×resume pairs)
web/                  # Vedika's Next.js app: compile-trace UI, receipts drawer; imports @dryrun/core
docs/                 # spec.md, decision-log.md, post-hackathon-ideas.md
.github/workflows/ci.yml   # pnpm install + typecheck + vitest + next build
```

## Build order — Timothy's lane

- **Commit 1 — Schemas + strict SO calls.** Zod models for JD requirement lines and resume lines, one schema family, every line carrying a source span (char offsets). Parser calls via the OpenAI Responses API structured-output path (`openai.responses.parse({ text: { format: zodTextFormat(Model, "name") } })` — confirm current signature via Context7 before writing). One sample JD + one resume as fixtures. (Bootstrap `Gap`/`RequirementLine`/`ResumeLine` schemas already live in `packages/core/src/schemas`.) **Receipts strategy (21 Jul): models emit verbatim quotes, never char offsets; spans are computed by the deterministic locator in `packages/core/src/parsers/spans.ts`, and unlocatable quotes surface in a `dropped` array (feeds the citation-validity eval).** Plan: `docs/superpowers/plans/2026-07-21-commit-1-schemas-parsers.md`.
- **Commit 2 — Diff + receipts, green on 3 hand-built fixtures. ✅ shipped 21 Jul (PR #6).** Embedding match (in-memory cosine at fixture scale; pgvector persistence is a later step, after the harness) + one batched LLM adjudication → typed set-difference: *missing / weak evidence / strong differentiator*, every row with JD-span + resume-span receipts from the parsers' precomputed spans. Live-green on all 3 pairs; `/api/compile` runs the real pipeline. **The `Gap` schema froze here.**
- **Commit 3 — Sandboxed SQL harness.** Given a challenge spec (`ChallengeSpec`: setup DDL+seed, reference solution, tests), execute in an ephemeral in-memory `better-sqlite3` instance; reject any challenge whose own tests fail, and any spec with no test exercising the reference solution. CI runs it as the named "Challenge executability" step. Plan: `docs/superpowers/plans/2026-07-21-commit-3-sql-harness.md`.
- **Then:** pgvector persistence → Challenge Compiler (SQL-first) → Behavioral Compiler (STAR scaffolds, cites weak-evidence rows, no scoring) → **Eval Suite**: gap-detection precision on 15–20 hand-adjudicated pairs, citation-validity rate, 100% challenge executability (CI), run-to-run Jaccard consistency over 20 runs, cost + latency per compile, and the zero-shot ChatGPT baseline (its hallucinated-gap and uncited-claim rate vs ours). The eval numbers are the Evidence pillar — treat them as a feature, not an afterthought.

## Vedika handoff points

- Compile-trace UI + receipts drawer import the diff engine's types straight from `@dryrun/core` (no JSON translation layer). **The `Gap` schema is frozen as of 21 Jul (Commit 2 / PR #6)**; breaking changes require a decision-log entry and a ping to her — and surface as TypeScript errors in `web/`.
- Mock-mode flow and the 3-min video storyboard are hers; neither blocks the MVP demo path.
- **FE status (21 Jul, merged to `main`):** pages landed — landing, `/compile`, `/results`, `/compiler/[lang]`, `/about`, navbar + mock auth. `web/app/api/compile/route.ts` **runs the real pipeline since PR #6** (parse ×2 + `diffGaps`, same `{gaps: Gap[]}` shape, per-request client so builds stay key-free). A real compile takes ~30–90s — the UI wants a loading state. ⚠️ **Open cut-list item on `main`:** PR #4 was merged (21 Jul) with `web/app/results/page.tsx` still hardcoding `READINESS_PERCENT = 65` + animated readiness bar — cut-list item #1. Vedika swaps it for something receipt-backed (e.g., per-kind gap counts) in a follow-up PR; must be gone before the demo/video.

## P1 fence (only after the MVP demo path is green end-to-end)

Context paste (true-gap vs presentation-gap reclassification, receipts required) · text mock mode (no scoring claims) · voice mock turn (Whisper STT + `gpt-4o-mini-tts` — never the Realtime API; it burns the credits).

## Final-week checklist (29–30 Jul)

Re-scan BoardingPass + app stores for newly shipped interview-prep features; if found, narrow the pitch to the receipts + execution-verified mechanism. Run `gitleaks detect` over the full history as final insurance; confirm CI badge, video link, and write-up in README.

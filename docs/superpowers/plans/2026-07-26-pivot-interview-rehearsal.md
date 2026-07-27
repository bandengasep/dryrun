# DryRun — Pivot Plan: "Rehearse the interview you're about to have" (Sun 26 Jul → Fri 31 Jul 23:59 SGT)

> Execution happens in separate implementation sessions (Opus 5). First implementation act: copy this file to `docs/superpowers/plans/2026-07-26-pivot-interview-rehearsal.md`.
> STATUS: complete — decisions locked with Timothy 26 Jul; architecture designed same day.

## Context — why this plan exists

DryRun was "the interview compiler" (JD×resume → evidenced gaps → executable SQL challenges). On 26 Jul Timothy decided a **full pivot of the product surface**: the headline is now a personalized **mock-interview rehearsal** — compile the interview you're likely to face, rehearse it against an AI interviewer, get a debrief where every piece of feedback quotes your own words. Trigger: real JDs (e.g., Venture Corp BI/AI internship from NBS CareerGO) mix concrete tool lines with soft competency lines; interview-question prep generalizes across both, while SQL drills only fire on the concrete subset. Decision made with full knowledge that the SQL Challenge Compiler tier is dropped this week (its harness + CI gate stay in-repo as proven infrastructure and Trajectory material).

**What survives untouched (the brain):** parsers with verbatim-quote receipts + deterministic span locator, gap diff with citation guard, `Gap` schema (frozen), `/api/compile`, the SQL harness + CI executability step (unused but green), all 3 fixtures.

**Deadline & submission:** Fri 31 Jul 23:59 SGT — public repo + ≤3-min video + ≤1,000-word write-up **with the five pillars as section headings**.

## The rubric (fetched verbatim from the Launchpad page — design to it)

1. **Problem** — "precise problem statement, why existing approaches fall short, success criteria defined before you built."
2. **Approach** — "every major decision reasoned, alternatives named."
3. **Evidence** — "every claim backed by a measurement, comparison, or demonstration."
4. **Constraints** — "cost, latency, compute, reliability, safety."
5. **Honesty & Trajectory** — "known failure modes, honest limitations, concrete next-steps plan."

Master rule: *"a modest claim, proven, beats a grand claim, asserted. Blanket statements are the fastest way to lose a judge."* After scoring, judges answer **whether they would interview the applicant**. Prizes: OpenAI credits (1st $5k / 2nd $3k / 3rd $2k) + **"Best Use of Agnes AI" $500 cash**. Sponsors: Agnes AI, OpenAI, GMI Cloud, Zo Computer.

The pivot itself is Approach/Trajectory material: the decision log documents the 26-Jul reasoning with the SQL-first alternative *named and parked built*, not vaporware.

## Locked decisions (26 Jul, with Timothy — do not re-litigate)

1. **Product = session + debrief.** Compile → Session Plan (receipt-carrying questions) → live AI-interviewer mock → cited debrief. Gap engine remains the personalization brain.
2. **Modality target = video answers via VideoDB** (Timothy has credits + key). Text chat ships first as the floor and permanent fallback; video is the differentiator rung with a **Wed 15:00 go/no-go gate**.
3. **SQL challenge tier dropped this week.** Harness + CI stay. Write-up frames executable drills as built-and-parked (Trajectory).
4. **Providers: OpenAI + Agnes AI only** (keys in hand). Agnes is OpenAI-compatible → wired via the existing client-injection seam (`new OpenAI({baseURL, apiKey})`). **No Vercel AI SDK migration** (researched: OpenAI's own Responses API + strict SO is the recommended path; AI SDK adds a schema-conversion layer + re-validation risk with no eval net; its unique win—partial-object streaming—isn't needed). **No GMI** (no key). Agnes gets the interviewer lane → Best-Use prize story + provider comparison in evals.
5. **No numeric scoring of answers — as a stance, not a cut.** Debrief cites the candidate's own transcript verbatim (validated mechanically with `locateSpan` over the transcript — the receipts machinery generalizes). Carried over from old rules because the *reasons* hold: unprovable claims lose judges.
6. **Still dead:** pgvector/Supabase (no dep exists), LinkedIn in runtime (not serverless-feasible + ToS; verified), Realtime speech-to-speech API (credit burn), readiness scores, resume rewriting. Old cut list is otherwise superseded by this plan; AGENTS.md gets rewritten (Commit 0).
7. **Ownership:** Claude sessions = design (Paper) + all code. Timothy = keys/redemptions, eval-pair adjudication (Wed), demo dry-run. Vedika = 3-min video + write-up polish (Fri). *(Attribution note, corrected 26 Jul: the original ground rules/cut list were Timothy's own 12-Jul close-out, not Vedika's. Never claim otherwise in the write-up.)*

## Verified external facts (26 Jul — trust these, re-verify only endpoints marked ⚠)

- **Agnes AI**: Singapore gateway, OpenAI-compatible multimodal API, free tier. ⚠ Verify before coding: chat-completions endpoint base URL, available model names, rate limits (agnes-ai.com/en/docs/overview; catalog: github.com/AgnesAI-Labs/AgnesAI-Models).
- **GMI Cloud**: OpenAI-compatible (`api.gmi-serving.com/v1`) — parked, no key.
- **VideoDB**: record/upload → auto-transcribe → scene/audio index → timestamped semantic search → clip generation. Node SDK `npm install videodb`. ⚠ Verify before coding: upload flow from browser (direct vs server-proxied), transcript retrieval shape, latency expectations (docs.videodb.io + /llms.txt; use context7 too).
- **linkedin-mcp-server**: needs persistent local Chromium + cookies; not serverless; ToS-ban warnings in its own README. Runtime integration permanently parked.
- **Vercel**: App Router `export const maxDuration` per route (compile already sets 300 — needs Fluid/Pro; verify plan limits at deploy); streaming responses keep connections alive; serverless = stateless → **session state is client-held** ({plan, transcript} sent per turn; no DB anywhere this week).
- **pnpm 11 gates** for any new dep (only `videodb` expected): `allowBuilds` allowlist for native postinstalls, `minimumReleaseAge` may refuse fresh versions (exclude list exists), CI `--frozen-lockfile` → commit the lockfile.

## Current-state ground truth (verified in-repo 26 Jul)

- Git: everything merged to `main` (PRs #7 AND #8 — docs claiming "#7 open" are stale); `timothy` = 1 commit behind `origin/main`, fast-forward first. FE branches (`dryrun-FE-V0`, `vedika`) fully merged/stale — never branch from them (they'd revert core). No commits since 21 Jul.
- `packages/core` (1,374 lines): schemas (`SourceSpan`, `RequirementLine`, `ResumeLine`, `Gap` frozen, `ChallengeSpec`/`ChallengeRunResult`), `parseJD`/`parseResume` (strict SO via `responses.parse`+`zodTextFormat`, client injection, `dropped[]`), `locateSpan` (`src/parsers/spans.ts`), `diffGaps` (embeddings + batched adjudication; citation guard at `src/diff/index.ts:149`), `runChallenge` harness (`@dryrun/core/harness` subpath). `src/evals/` is a 4-line stub. Fixtures: 3 pairs (data roles), no gold adjudications yet. CI: typecheck → vitest → harness executability → web build; keyless, live tests self-skip.
- `web/`: CSS Modules + `globals.css` tokens (dark navy `#0a0f1c…#1a2740`, cyan `#22d3ee`, semantic green/amber/red/purple, `--font-code: "Google Sans Code"`); dark-only; 3 components total; `motion` v12. **Demo-path break: `/compile` fetches real `Gap[]` then discards it; `/results` is 100% hardcoded** (readiness bar `READINESS_PERCENT=65` at `results/page.tsx:8` — delete; mock challenge cards; no gap/receipt/drawer UI exists). `/compiler/[lang]`: editor shell with **fake always-pass Run** (delete/repurpose). Landing+compile carry **false "Runs entirely on-device" claim** (landing :139, compile :167) — fix in copy pass. `/api/compile`: per-request `new OpenAI()`, maxDuration 300, no streaming yet. Mock auth is cosmetic (make instant or cut). Dead file `web/app/landing.tsx`; 1.4MB logo via raw `<img>`; fonts via raw `<link>`.
- Paper: file "Dryrun-WebApp" (01KYEV3N4YBFWC8EYE4RHSCADX) is EMPTY — design starts from blank canvas; only baseline is the web tokens above. Paper guide workflow loaded: brief (mood/palette/type) posted before mutations → tokens first (Tailwind-v4 format) → small write_html chunks → screenshot reviews → `finish_working_on_nodes`.
- Old spec's demo insurance: `dryrun-FE-V0` contains a keyless keyword-overlap mock compile route — salvage as explicit `?mock=1` offline fallback for the stage demo.

## Product definition (the five surfaces)

1. **Compile** — paste JD + resume (existing form) → SSE-streamed trace (parse ✓ / locate spans ✓ / embed ✓ / adjudicate ✓ / N gaps) → gaps with receipts.
2. **Session Plan** ("your interview, compiled") — behavioral + technical-conceptual questions, each citing `gapId` → JD span + resume span; STAR hints for behavioral; receipts drawer shows the quoted lines. Grounding guard: any question citing a nonexistent gap is rejected (mirror of diff's citation guard).
3. **Session Room** — AI interviewer (Agnes lane, OpenAI fallback) asks plan questions with adaptive follow-ups, streaming; candidate answers by text or records a **video answer** (VideoDB: upload → transcript + timestamps). Question-progress rail. No scoring anywhere.
4. **Debrief** — per-question: what the answer covered / what it missed, every claim anchored to a verbatim transcript quote (mechanically validated via `locateSpan` over the transcript) + VideoDB timestamp links when video. Explicit "we don't grade — we cite" framing.
5. **Evidence** — eval numbers in README: question-grounding rate, debrief citation-validity, consistency (Jaccard over 20 runs), cost + latency per compile/session, OpenAI-vs-Agnes comparison, zero-shot ChatGPT baseline (uncited/hallucinated content rate). Success-criteria targets written into the spec addendum **before** building (Problem pillar rewards this).

## Architecture (designed 26 Jul; mirrors existing core patterns — guards like diff, demotion like parsers, client injection everywhere)

### Schemas — extend `packages/core/src/schemas/index.ts` (Gap stays frozen; `.nullable()` never `.optional()`)

- `QuestionKind = "behavioral" | "conceptual"`; `StarHints {situation, task, action, result}` (one-liners).
- `InterviewQuestion {id: "q-N", kind, gapId, question, starHints: StarHints|null, rationale}` — `gapId` is THE receipt.
- `SessionPlan {id, createdAt, jdText, resumeText, gaps: Gap[], questions: InterviewQuestion[].min(1)}` — self-contained client state; FE resolves `question.gapId` → spans via embedded `gaps`.
- `TimedWord {start, end, text}` (seconds, from VideoDB timed transcript); `TranscriptTurn {role: interviewer|candidate, questionId|null, text, mode: text|video, videoId|null, timedWords|null}` — for video turns, `text` is built ONLY by `joinTimedWords` (single-space join), so char-offset → timestamp is exact arithmetic.
- Debrief: `TranscriptQuote {turnIndex, span: SourceSpan, videoTime: {startSec,endSec}|null}`; `CoveragePoint {claim, quote}` (every displayed claim quotes the candidate verbatim); `MissedPoint {claim}` (absence claims carry no receipt — missing_skill precedent); `DroppedQuote {questionId, claim, quote, reason: "quote_not_found"}`; `QuestionDebrief {questionId, gapId (copied from plan, not model), summary, covered[], missed[]}`; `DebriefReport {planId, perQuestion[], dropped[]}` — dropped shown as an honesty footer, never hidden.

### Core modules (all isomorphic; barrel adds `plan`, `session`, `debrief`)

- **`src/plan/`** — `compileSessionPlan(gaps, jd, resume, opts: {client, model?, maxQuestions?=6}): Promise<SessionPlan>`; one batched `responses.parse` (gpt-5-mini). Policy: missing_skill→conceptual, weak_evidence→behavioral+STAR, ≤1 strong_differentiator flex. Guards (mirror diff): unknown `gapId` → throw `PlanError`; behavioral without STAR → throw; conceptual WITH starHints → coerce null (drop, never fabricate); zero gaps/questions or refusal → throw. `PlanWire` in `wire.ts`.
- **`src/session/`** — core owns prompt+protocol, web owns transport. `buildInterviewerMessages(state: {plan, transcript, questionIndex})` → chat messages (persona + current question + gap receipts as context + rules); `splitReplyAndMeta(full)` parses a trailing `META: {"action": "ask_followup"|"advance"|"wrap_up"}` sentinel line (fail-soft to ask_followup; mid-text META inert — pinned by test). Uses **chat.completions streaming** (the OpenAI-compatible lowest common denominator — must run on Agnes). **Client is the state machine**: holds questionIndex, caps follow-ups at 2/question, decides wrap-up; model only suggests.
- **`src/debrief/`** — `compileDebrief(plan, transcript, opts): Promise<DebriefReport>`; one batched `responses.parse` over answered questions; then per covered-point: `locateSpan` against the question's candidate turns (then all turns, `fromIndex` continuation for duplicates). Located → `TranscriptQuote` (+ `videoTime = timeForSpan(timedWords, span)` for video turns — computed, never model-emitted; `timeline.ts` is pure mechanics). Not located → **demoted to `dropped[]`** (parser precedent). Structural failures throw `DebriefError` (unknown questionId, refusal, answered-question coverage hole). Unanswered questions render "not attempted".

### Web routes (all stateless; session state client-held, re-sent each request)

Shared: `web/app/lib/stream.ts` (SSE framing both streaming routes + `readSSE` client parser; `: heartbeat` comment every 10s); `web/app/lib/providers.ts` (`makeInterviewerClient()` from env `INTERVIEWER_PROVIDER=agnes|openai`, `AGNES_BASE_URL` default `https://apihub.agnes-ai.com/v1`, `AGNES_MODEL` default `agnes-2.0-flash`, fallback `new OpenAI()` + gpt-5-mini).

| Route | Body → Response | maxDuration |
|---|---|---|
| `/api/compile` (rewrite) | `{jd, resume}` → **SSE**: `stage {parsing\|diffing}` → `result {jd, resume, gaps}` \| `error` | 300 |
| `/api/plan` (new) | `{jd, resume, gaps}` → `{plan: SessionPlan}`; 400 on empty gaps | 120 |
| `/api/session/turn` (new) | `{plan, transcript, questionIndex}` → **SSE**: `provider {name, failover?}` → `delta {text}…` → `meta {action}` → `done` | 120 |
| `/api/debrief` (new) | `{plan, transcript}` → `{debrief: DebriefReport}` | 300 |
| `/api/video/upload-url` (new) | `{}` → `{uploadUrl, videoId}` (server-minted) | 30 |
| `/api/video/transcript` (new) | `{videoId}` → `{text, words: TimedWord[]}` (indexSpokenWords + timed transcript; text via `joinTimedWords`) | 300 |

Decisions: **two-step compile** (gaps render ~30s sooner; diff stays a first-class artifact; plan retry doesn't re-buy parses — `/plan` page fires plan compile on mount). **Video uploads go direct-to-VideoDB via server-minted upload URL, never proxied** (Vercel ~4.5MB body cap; a 90s webm exceeds it). **Turn failover**: Agnes error before first byte → retry once on OpenAI, emit `provider {failover:true}` — demo-safe, honestly labeled. VideoDB client constructed per-request (keyless build). **State bridge**: `web/app/lib/session-state.tsx` — React context + reducer `{compile, plan, transcript, debrief}`, hydrated/persisted via **sessionStorage** (`dryrun-session-v1`; per-tab, dies with browser — honest "nothing stored" stance, survives refresh). Only new dep: `videodb` in web/ (pnpm 11: likely pure-JS; add `minimumReleaseAgeExclude` entry if fresh; commit lockfile).

### FE map (CSS Modules, existing tokens; kind colors red/amber/green, cyan primary)

| Path | Action |
|---|---|
| `/` | Copy reframe: "Rehearse the interview you're about to have." + 4-step strip; **remove false "on-device" claim**, dead demo link, CDN-Vanta decision (keep but with static fallback) |
| `/compile` | Keep form; fetch → `readSSE`; inline `StageTrace` replaces spinner; on result → dispatch + `router.push("/plan")`; remove false claim (:167) |
| `/plan` (new) | Per-kind count strip (the receipt-backed readiness-bar replacement) + `GapCard` list + `QuestionCard` list (fires `/api/plan` on mount, skeleton meanwhile) + "Start the session" CTA |
| `/session` (new) | `QuestionRail` (progress) + `ChatStream` + `AnswerComposer` (textarea + Record toggle behind `NEXT_PUBLIC_ENABLE_VIDEO=1`); End session → `/debrief` |
| `/debrief` (new) | Fires `/api/debrief` on mount; `DebriefRow` per question (covered w/ clickable `QuoteChip`s → seek `DebriefPlayer` to videoTime / highlight transcript; missed; not-attempted); honesty footer "N claims failed mechanical quote validation and were withheld"; NO scores |
| `/results`, `/compiler/[lang]` | **Delete** (readiness bar + fake Run die with them); update `Navbar` tabs; delete dead `landing.tsx` |

Components to build: `StageTrace, GapCard, GapKindChip, ReceiptsDrawer (shared /plan + /debrief), QuestionCard, QuestionRail, ChatStream, AnswerComposer, Recorder (getUserMedia+MediaRecorder→webm, states incl. failed→text fallback), QuoteChip, DebriefRow, DebriefPlayer`.

**Paper design: DONE (Sun eve–Mon AM, 27 Jul).** ⚠ AMENDED: the dark-navy/cyan identity was replaced by Timothy's call with **"Reading Room daylight"** (cool paper `#F5F7FB` / hero gradient `#EDF1F7→#FFFFFF`, white surfaces, hairlines `#DEE4ED`, ink text `#1D2127`, ink-blue primary `#2E4C8F`, status `#C05353/#A87E2F/#3E7D63`; Fraunces display + Instrument Sans UI + Google Sans Code evidence). Tokens + 4 artboards + theme tile live in Paper "Dryrun-WebApp". Landing layout additionally references the remixed Framer "Message" template as a measured spec (Vercel-only hosting). FE code translates via `get_jsx`/`get_computed_styles` (never screenshots).

### Evals (`src/evals/` pure metrics + vitest runner in `test/evals/`; results committed as `evals/results/*.json` + README table)

Metrics: `questionGroundingRate` (pre-guard model rate; shipped rate is 100% by construction), `debriefCitationStats` (emitted/located/droppedRate), `gapKey` + `meanPairwiseJaccard` (canonical key = normalized jdSpan.text + kind; 20 runs × 3 pairs), `costUSD` (PRICES table; per-call usage capture incl. `stream_options.include_usage`), `uncitedRate` (baseline's quoted fragments mechanically located in JD/resume). Runner tests gated `describe.skipIf(!RUN_EVALS || !OPENAI_API_KEY)`; `pnpm --filter @dryrun/core evals`. Corpus: fixtures `jd/resume-04..13` (Timothy's CareerGO exports Tue) + `gold/gold-*.json` hand-adjudicated Wed. Provider comparison: plan compile OpenAI vs Agnes (pre-guard grounding, guard-rejection rate, STAR completeness, cost, latency; Agnes adapter falls back to `chat.completions` + `response_format: json_schema` if `/responses` unsupported). Baseline: zero-shot gpt-5-mini chat, same inputs → questions; `uncitedRate` mechanically. Classification stated in README: mechanical / human-adjudicated / (no LLM-judged — conflicts with no-scores stance). Cost envelope ≪ $15 of the $150.

### Testing

Offline CI (mock clients, reuse `stubClient` capture pattern from `test/diff.test.ts`): `plan.test.ts` (guards incl. fabricated gapId throw, STAR invariants, id assignment, refusal), `debrief.test.ts` (slice-invariant on located quotes, demotion to dropped, videoTime exactness, `fromIndex` duplicates), `session.test.ts` (message building, sentinel parse fail-soft, mid-text META inert), `evals-metrics.test.ts` (units). Live self-skip: `plan.live`, `debrief.live` (scripted 3-turn transcript), `agnes.live` (gated on `AGNES_API_KEY`; probes `/responses` support and records the answer). CI keyless as today; harness step untouched.

## Success criteria (locked into `docs/spec-pivot-2026-07-26.md` BEFORE building — Problem pillar)

Displayed-question grounding 100% by construction (pre-guard model rate ≥95%) · displayed debrief quotes 100% mechanically valid (dropped-rate <10%) · mean pairwise Jaccard ≥0.6/pair over 20 runs · gold precision ≥0.8, recall ≥0.7 · cost: compile ≤$0.05, full session ≤$0.25 median · latency: compile p50 ≤60s, plan ≤20s, first turn token ≤3s, debrief ≤45s · video quote→timestamp exact mapping ≥90% · baseline uncited-content rate reported side-by-side.

## Schedule (SGT; owners per locked decision #7 — Claude sessions carry ALL design + code)

| Day | Claude session A (core/BE) | Claude session B (design/FE) | Timothy | Vedika |
|---|---|---|---|---|
| **Sun eve** (optional head start) | Commit 0 docs (§below) + fast-forward `timothy` + Agnes key smoke | — | Approve plan; keys into `.env` | — |
| **Mon 27** | Schemas + `src/plan` + guards + offline tests; `/api/plan`; `/api/compile` SSE rewrite + `stream.ts` | **60-min verify sprint** (§below) → Paper brief + tokens + `/plan` `/session` `/debrief` artboards; state bridge; delete `/results` `/compiler` `landing.tsx`; Navbar; `/compile` SSE + StageTrace | Redeem/confirm keys; sanity-run compile on Venture JD (fixture #4) | Landing/about copy pass |
| **Tue 28** | `src/session` + turn route (SSE, provider env, failover) + Agnes live smoke; `src/debrief` + `timeline.ts` + tests; **preview deploy — verify SSE on real Vercel** | `/plan` page (GapCard, QuestionCard, ReceiptsDrawer) from Paper; `/session` shell (ChatStream, AnswerComposer, QuestionRail) | Export 10 JD×resume pairs → fixtures 04–13 | Storyboard draft |
| **Wed 29** | AM: video spike — Recorder→upload-url→PUT→indexSpokenWords→timed transcript end-to-end on preview. **15:00 GATE.** PM: `/api/debrief` + `/api/video/*` (or fallback path) | Recorder UI states; `/debrief` page (DebriefRow, QuoteChip, DebriefPlayer, honesty footer) | **15:00 video go/no-go**; evening: hand-adjudicate gold sets | Demo-take rehearsal |
| **Thu 30** | Evals: metrics + runner + corpus runs + provider compare + baseline → results JSON + tables; fix fallout | Polish: loading/empty/error states; receipts drawer everywhere; prod deploy | BoardingPass/app-store rescan; review numbers vs targets | First video takes |
| **Fri 31** | AM freeze — demo-path bug bash only; README rewrite (status, eval table); write-up draft (five pillar headings) | Support bug bash | `gitleaks detect` full history; finalize write-up ≤1000 words; **submit by 20:00** (buffer to 23:59) | Final 3-min cut (open on Timothy's own Venture JD, close on baseline-vs-ours numbers) |

**Wed 15:00 video gate:** a browser-recorded 60s webm must complete upload → index → timed transcript with exact `timeForSpan` mapping on the preview deploy. Fail → `NEXT_PUBLIC_ENABLE_VIDEO=0`, VideoDB → post-hackathon ideas, session ships text-only, debrief unchanged minus timestamps (that's why debrief validates against `turn.text`, not video primitives).

## Commit 0 — doc changes (first implementation act)

- Copy this plan to `docs/superpowers/plans/2026-07-26-pivot-interview-rehearsal.md`.
- **AGENTS.md rewrite**: new headline + 4-stage flow; ground rules — receipts everywhere STAYS (gap→JD/resume spans; question→gapId; debrief claim→verbatim transcript quote+timestamp); **no-scores stance** promoted to named rule; Realtime-API ban stays; client-held state / no DB as architecture rule; providers = OpenAI + Agnes via injection seam; updated cut list (SQL generator, pgvector/Supabase, LinkedIn runtime, GMI → parked); new build order; harness marked "kept, dormant"; Vedika handoff: SessionPlan/TranscriptTurn/DebriefReport freeze after Tue; fix stale PR-#7/evals claims in README.
- **decision-log.md** 2026-07-26 entries: the pivot + rationale (alternatives named: SQL-first parked built); two-step compile; chat-completions + sentinel protocol; sessionStorage client-held state; direct-upload video + Wed gate; eval targets locked pre-build; page deletions.
- **`docs/spec-pivot-2026-07-26.md`** (new; old spec.md stays as history): flow spec + the success-criteria numbers above.
- **post-hackathon-ideas.md** additions: SQL Challenge Compiler tier (harness built+green), GMI lane, LinkedIn runtime, browser extension, whole-session recording/highlight reel.

## Verify-in-docs Monday morning (60 min, before coding)

1. **VideoDB Node SDK**: upload-URL parity for direct browser PUT (`getUploadUrl`?), file/buffer upload signature, timed-transcript retrieval (word- vs segment-level), `@videodb/recorder` package as possible Recorder replacement, native postinstall?, release age vs pnpm gate.
2. **Agnes**: does `apihub.agnes-ai.com/v1` serve `/responses` (→ core's `responses.parse` works unmodified) or only `/chat/completions`? `response_format: json_schema`? streaming? rate limits? model list beyond `agnes-2.0-flash`.
3. **Vercel**: request-body limit (~4.5MB assumption), SSE flush behavior in App Router Node runtime, `maxDuration` × streaming on current plan.
4. **OpenAI v6**: `chat.completions.create({stream:true})` chunk shape + `stream_options: {include_usage: true}` for cost capture.
5. **MediaRecorder**: bitrate options for small webm (Chrome-only is acceptable for demo).

## Opus 5 implementation-session handoff rules

- Work on `timothy` branch; PR to `main` at least daily; `main` stays demoable; CI must be green (`protect-main` ruleset enforces).
- Verify external APIs against current docs before coding (context7 / vendor docs) — Agnes endpoint+models, VideoDB SDK flow are the two ⚠ items. OpenAI patterns: copy the existing parsers/diff call sites.
- Secrets only in `.env` / `web/.env.local` (gitignored); `.env.example` stays placeholder-only; never echo key values (check placement via `git status` + length checks only). New env names: `AGNES_API_KEY` (+ base URL const), `VIDEODB_API_KEY`.
- Only new dependency: `videodb` (web/). Mind pnpm 11 gates; commit lockfile.
- Prefer inline work + focused subagents over big Workflow fan-outs (Timothy's spend cap has killed large Workflow runs before).
- Paper design is complete — do NOT redesign. Theme is "Reading Room daylight" (see AGENTS.md Stack); `globals.css` gets rewritten from the Paper tokens (light theme replaces the old dark navy entirely — no dark mode this week). Fonts via `next/font`: Fraunces, Instrument Sans, Google Sans Code.
- Every feature carries receipts or it doesn't ship — unchanged law.

## Risk register

| # | Risk | L/I | Mitigation |
|---|---|---|---|
| 1 | **Agnes compatibility** — `/responses` support unknown; streaming quality/rate limits unknown | Med/Med | Interviewer lane uses chat.completions streaming (lowest common denominator); per-request failover to OpenAI before first byte; evals adapter falls back to `response_format: json_schema`; worst case Agnes ships as "attempted, incompatibility documented" — honest and still prize-eligible effort |
| 2 | **VideoDB** — beta Node SDK; browser-upload path undocumented; Vercel ~4.5MB body cap kills proxying; transcribe latency unknown | High/Med (contained) | Direct-upload-URL pattern (verify Mon); alternates: `@videodb/recorder`, raw REST; per-answer clips ≤2 min transcribe while candidate answers next question; **hard Wed 15:00 gate** → text-only fallback keeps the headline intact |
| 3 | **SSE on Vercel** — buffering, timeout mid-turn | Med/High unmitigated | Per-turn requests with client-held state (longest stream ≈ one turn); explicit `maxDuration` per route; heartbeat comments; Tue preview-deploy verification — never trust localhost streaming |
| 4 | **Eval-day compression** | Med/High | Thursday is evals-protected; mechanical validators are offline/keyless and built WITH the features (CI-enforced from day one), so Thursday is runs + tables, not implementation |
| 5 | pnpm 11 gates block `videodb` in CI | Low/Low | `minimumReleaseAgeExclude` entry + lockfile commit Monday; confirm no native postinstall |
| 6 | Stage-demo wifi/key failure | Low/Med | `?mock=1` offline fallback (salvage the keyword-overlap route from old `dryrun-FE-V0`); local run as backup |

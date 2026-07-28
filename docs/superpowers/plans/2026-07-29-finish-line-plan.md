# DryRun — Finish-Line Plan (Wed 29 Jul 00:00 → Fri 31 Jul 20:00 SGT submit)

> STATUS: FINAL — recon complete (two Explore agents + architect), decisions locked with Timothy Wed 00:45.
> Execution: THIS window, ultracode Workflow orchestration; implementation lanes on Sonnet (Fable = orchestrator only, per Timothy's limit-conservation ask).

## Context

Both Monday arms shipped and deployed: https://dryrun-web-pi.vercel.app is live in Reading Room daylight with /compile (SSE trace) and /plan (real compiled questions with receipts + STAR chips) working end-to-end. Two visible gaps triggered this session:
1. **Inputs**: JD is paste-only (no screenshot/PNG upload despite being asked), resume upload accepts only .txt/.md — no PDF/DOCX.
2. **Pipeline incomplete**: /plan's footer says it plainly — "the rehearsal room isn't in this build yet." Session room, debrief, save & share, video rung, and evals remain.

~44 hours to the self-imposed Fri 20:00 submit buffer. This plan closes everything that ships, cuts what doesn't, and runs the build as parallel ultracode workflows in this window.

## Verified mechanisms (checked against current OpenAI docs, 29 Jul 00:xx)

**Document extraction for uploads** — one seam, three input kinds, all through the existing OpenAI client:
- **Screenshot (PNG/JPG)**: Responses API `input_image` with a base64 data URL (`data:image/png;base64,...`) + `input_text` instruction "transcribe this job posting verbatim to plain text". gpt-5-mini is multimodal.
- **PDF**: Responses API `input_file` with `filename` + `file_data` data URL (`data:application/pdf;base64,...`) — handles text AND scanned PDFs (vision). Resume PDFs are typically ≪4.5MB Vercel body cap even base64'd; enforce a client-side size check.
- **DOCX**: extracted **client-side** with `mammoth` (already installed + Timothy-sanctioned 28 Jul; `pdfjs-dist` likewise) → text goes straight into the textarea; no API call, no body-cap concern. All three paths already exist in the shipped-but-unwired `web/app/lib/extract.ts`.
- **Receipts integrity preserved**: extraction happens BEFORE the pipeline; the extracted text lands in the (editable) textarea and becomes `sourceText` — the user reviews/corrects it, then compiles. `locateSpan` invariants untouched. Honesty note for the write-up: vision transcription can err; the review-before-compile step is the mitigation, stated on the page.

## Decisions locked (Timothy, Wed 00:45)

1. **Video: NO-GO, called now** — 15 hours ahead of the pre-committed gate, on evidence (zero transport code; substrate complete so debrief loses only timestamps). Decision-log entry frames it as the gate working. `videodb` never gets installed; VideoDB moves to post-hackathon ideas.
2. **Landing: full 9-section spec build** (docs/landing-spec-2026-07-27.md). Evidence band ships Wed with "target vs measured" placeholders, real numbers wired Thursday.
3. **Gold corpus: 8 pairs** — 3 existing + resume-04 pairing + 4 new drafted pairs; Timothy adjudicates Wed evening (~90–120 min) against generated candidate gap sets.
4. **Input wiring: everything the shipped library supports, both columns** — JD and resume each get Paste/Upload with .txt/.md/.docx/.pdf/.png/.jpg; extraction lands as an editable DRAFT with a provenance note (vision-transcription honesty measured and logged 28 Jul).
5. **Subagent model policy (Timothy's ask, to protect Fable weekly limits):** implementation lanes run on **Sonnet**; verify/review agents **Sonnet at high effort**; Fable is only the orchestrator (this window). Workflow scripts set `model`/`effort` per agent() call. Eval runs spend OpenAI/Agnes API credits, not Claude tokens.

## Ground truth — FE + deploy (verified 29 Jul 00:xx, HEAD `a1c046c`, deploy current with HEAD)

**The decisive finding: Tuesday built five backends + the ingest library, deployed them all, and wired NONE to a screen.** Live-but-orphaned in prod (all 405 to GET): `/api/session/turn` (SSE `provider {name,model,failover}` → deltas → META), `/api/debrief` (maxDuration 300), `/api/session/save` (write-once via `lib/sessions.ts`, RLS-no-policies), `/api/extract-image`, plus `web/app/lib/extract.ts` (175L: txt/md · DOCX via mammoth · PDF via pdfjs-dist w/ page cap + truncated flag · image → downscale 1600px/JPEG q0.85 → `/api/extract-image`) — **zero importers**; deps `mammoth`, `pdfjs-dist`, `@supabase/supabase-js` installed; commit `cfb7b39` claims the feature but never touched `compile/page.tsx`. Its comment defines the UX contract: extraction result is a DRAFT into the editable textarea; user presses Compile.

**Pages:** `/compile` (built, good: SSE StageTrace, `&&` gate fixed, JSON errors surfaced, dropped-spans honesty note) · `/plan` (built, good: instant gaps, skeleton, zero-gap honesty, retry-plan-only, ReceiptsDrawer w/ Esc) · `/` landing (INTERIM — 2 sections vs spec's 9; its own header comment admits it) · `/about` (orphaned) · **`/session` and `/debrief`(+`/debrief/[id]`) DO NOT EXIST** — `ROUTE_READY = {session:false, debrief:false}` in `web/app/lib/routes.ts:14-17` gates the button, tabs, copy ("flipping a boolean here is the whole handover").

**Inputs precisely:** JD = bare textarea (`compile/page.tsx:206-213`), no upload of any kind; resume = Paste/Upload toggle, `.txt/.md` filename-regex only via `FileReader.readAsText` (`:94-110`), no MIME/size check. JD column is "one `<div>` away" from the resume column's toggle structure.

**State bridge:** `session-state.tsx` solid (sessionStorage `dryrun-session-v1`, cascade invalidation compile→plan→transcript→debrief, Zod-validated rehydrate, per-tab privacy rationale). One staleness: `DebriefReportPlaceholder = unknown` (:39) — core now exports the real type.

**Components:** StageTrace/GapCard/GapKindChip/QuestionCard/ReceiptCitation/ReceiptsDrawer/Navbar exist and are used; ReceiptsDrawer header comment anticipates /debrief reuse. `ChatStream`/`Recorder`/`AnswerComposer`/`QuestionRail` DO NOT EXIST. `Loader` is dead code; Auth is cosmetic.

**Video lane: absolutely nothing** — no `videodb` dep, no MediaRecorder ref, no `NEXT_PUBLIC_ENABLE_VIDEO` in code.

**Config:** fonts via next/font correct (Fraunces/Instrument Sans/Google Sans Code); no vercel.json; repo not CLI-linked (Git-integration deploys); `?mock=1` offline fallback MISSING.

**Edge-state tally (of the journey doc's 20):** 10 EXISTS · 5 PARTIAL (4 = API-live/UI-absent) · 6 MISSING (5 of them are the /session+video lane).

## Ground truth — core/docs (verified 29 Jul; HEAD `a1c046c` == origin/main, CI 5/5 green, 153/153 tests)

- **Backend for build-order steps 1–3 is DONE**: `src/plan` (all 3 guards), `src/session` (`buildInterviewerMessages`, `splitReplyAndMeta` fail-soft, `MAX_FOLLOWUPS=2`, `KICKOFF_USER_MESSAGE` Agnes fix), `src/debrief` (locateSpan validation → `dropped[]`, `NOT_ATTEMPTED_SUMMARY`, no-model-call on zero answers, 22.7s vs ≤45s target ✓), `src/ingest`, all 16 schemas, harness intact. Routes: compile(SSE)/plan/debrief/session-turn(SSE w/ clean-wire Agnes→OpenAI failover)/session-save/extract-image — all deployed.
- **Decision-log verified findings that BIND this plan**: Agnes `/responses` silently ignores json_schema → Agnes structured calls use `chat.completions` + `response_format: json_schema` (verified honored; `z.toJSONSchema(Wire,{io:"output"})` round-trip OK) — this IS the Thursday comparison adapter. OpenAI failover pins `reasoning_effort:"minimal"` (4.4s→1.16s first token). Usage arrives on a FINAL usage-only chunk. SSE-on-Vercel verified in prod (0.64s first frame). Fluid: 300s maxDuration on Hobby; 100MB bodies.
- **Measured-and-missed (honestly logged, levers identified, untried)**: compile 99.65s prod / 146.3s Venture JD vs ≤60s; plan 33.4s vs ≤20s; first-turn token ~6.2s vs ≤3s both providers (562-token prompt; 265-token probe hit 1.2s → prompt-trim lever). Policy: levers adopted ONLY if gold precision ≥0.8 / recall ≥0.7 hold; else targets restated with measurements (rubric rewards this).
- **Evals: 4-line stub, no runner, no gold, corpus = 3 pairs + unpaired jd-04.** Deferred quality items awaiting eval evidence: dedupe questions sharing `jdSpan.start`, cap missed points (9 observed), kind-mix skew (5 behavioral/1 conceptual).
- **Gotcha**: `test/setup.ts` loads root `.env` → "offline" test runs go live locally. Eval suites MUST gate on `RUN_EVALS=1`, never key-presence.
- Architect's corrections folded in: `/compile` already sends the SSE Accept header (TEMP JSON branch deletable now); turn-route docstring omits the real `usage` event; `session-state` rehydrate doesn't validate `debrief` (fix with the placeholder swap); JD-by-URL post-hackathon pointer dangling.

## Architecture: six lanes, one-writer-per-file ownership

**Ownership contract (conflict-proof by construction):**
- **Lane A — ingest wiring + `?mock=1`**: owns `compile/page.tsx` + its css, `web/app/lib/mock.ts` (NEW, API frozen at kickoff), mock wiring in `plan/page.tsx`. Extract the resume column's Paste/Upload structure into an in-file `DocumentInput` used by BOTH columns; replace the `.txt/.md` FileReader with `extractFromFile` (accept `.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp`; `IngestError` inline; busy state). **Draft-review UX**: extraction NEVER auto-compiles — text lands in the editable textarea + provenance strip (filename, origin, pages/truncated, stronger "check against the posting" note for screenshots). `mock.ts`: `mockCompile` (keyword overlap, `indexOf` spans so the invariant genuinely holds), `mockPlan`, `mockTurn`, `mockDebrief`, `mockEnabled()` + `MockBanner` (ochre, "Offline demo mode — no model calls").
- **Lane B — /session**: owns `web/app/session/**` (page, `useInterviewSession.ts` hook, css) + NEW components `ChatStream`, `AnswerComposer`, `QuestionRail`, `ProviderChip`. Consumes (read-only): `readSSE`, core's `splitReplyAndMeta`/`MAX_FOLLOWUPS` (isomorphic), session-state hooks, `ReceiptsDrawer`. **State machine**: `questionIndex` + `followupsUsed` DERIVED from transcript (refresh-safe); phases asking/awaiting_answer/wrapped/error; stream buffer local, ONE `transcript/append` per turn at `meta` with cleaned reply and **`questionId` on BOTH interviewer and candidate turns** (else debrief marks all not-attempted — the classic seam failure). META→UI: ask_followup ≤2 then client force-advances; advance auto-chains next question; wrap_up → wrapped panel → /debrief. Errors: stream-end-without-meta = failure → retry (idempotent — nothing appended pre-meta). Cmd/Ctrl+Enter send; End-session always visible, no guilt copy.
- **Lane C — /debrief + /debrief/[id]**: owns `web/app/debrief/**`, NEW components `DebriefView` (pure props `{plan,transcript,debrief,readOnly}` — shared by both pages), `DebriefRow`, `QuoteChip` (click → scroll+flash the span in `TranscriptView`), `TranscriptView`, `SaveShareButton` (idle/saving/saved+copy/error; stance copy on the button). ALSO owns `session-state.tsx` (swap `DebriefReportPlaceholder`→ real `DebriefReport` + `safeParse` on rehydrate, degrade to null) and `receipts.ts` (+`planToCompileShape(plan)` so the shared page reuses ReceiptsDrawer). **`/debrief/[id]` = server component calling `loadSession(id)` directly — no new API route** (lib/sessions.ts is RSC-safe; null → friendly miss; banner "Shared debrief · read-only · anyone with the link can view"). `/api/debrief` on mount w/ "typically ~25 seconds" copy; 422 `kind:"structure"` gets its own retry copy. Honesty footer ALWAYS rendered incl. "0 claims withheld".
- **Lane D — landing (full 9-section spec)**: owns `web/app/page.tsx` + css + NEW `web/app/components/landing/*` (Hero + static `TraceCardMock`, `ReceiptsTrio` w/ mini-mocks, `FourStages`, `SampleDebrief` labeled, `EvidenceBand` shipping "targets, labeled as targets" — real numbers Thu, `Faq` ×4 real questions, `FinalCta`). Measured system per landing-spec (1128px/96px rhythm/160-64 hero/ink@12% borders/radii 20-40). Trace texture = dimmed `<pre>`, no canvas. **globals.css/Navbar/layout FROZEN** — landing-only styles stay in page.module.css; global Navbar retained (spec's landing nav = deliberate scope cut).
- **Lane E — evals (P0)**: owns `src/evals/index.ts` (replaces stub: `questionGroundingRate`, `starComplianceRate`, `kindMix`, `duplicateJdSpanGroups`, `debriefCitationStats`, `gapKey`+`meanPairwiseJaccard`, `costUSD`+dated `PRICES` (Agnes → cost null, tokens reported — never invent a price), `uncitedRate` via `locateSpan`, `scoreGold`) + `test/evals-metrics.test.ts` (offline) + `test/evals/` keyed runner (harness.ts metered client + `writeResult` → `evals/results/*.json` committed; agnes-adapter.ts; adjudication-prep; grounding; consistency 20×2 pairs backgrounded; gold-score **offline** — pure scoring of committed files; provider-comparison; baseline; latency-levers) + `test/gold/` + fixture additions (resume-04 = Timothy's resume + 4 CareerGO pairs). **Additive core options only**: `onWire?` observer on plan/debrief; `requestOverrides?` on parser/diff/plan options (carries `reasoning:{effort}`); adoption = one providers.ts commit Thu, integration-owned. Gold protocol: per-pair JSON, Timothy marks `verdict: agree|wrong_kind|not_a_requirement` + `missedRequirements[]`; precision=agree/total, recall=agree/(agree+missed).
- **Lane F — docs/cleanups** (Thu night): README status table + eval table + video-link slot; AGENTS layout block → reality; stream.ts stale comments; `/api/compile` JSON-branch delete; turn-route docstring `usage` event; post-hackathon JD-by-URL entry; consolidated decision-log entries (incl. video no-go).
- **Integration-only files (orchestrator commits, never lanes)**: `lib/routes.ts` (BOTH booleans flip in ONE commit after live E2E), `providers.ts` (lever adoption Thu if evidence holds), landing evidence-band number swap.

## Ultracode execution design (this window orchestrates)

- **Wave 1 (now → ~08:30)**: one Workflow, 4 parallel lanes A/B/C/E-part-1, **`model:"sonnet"`**, shared tree (ownership table makes it safe — cheaper than worktrees), **lanes edit files only, never run git** — the orchestrator reviews diffs, commits lane-by-lane in merge order A→B→C→E-metrics, runs typecheck+vitest between. Lanes run only their own targeted vitest files. Each lane brief embeds: ownership table, frozen interfaces (mock.ts API, DebriefView props, results schema), relevant ground-truth excerpts, edge-state rows it must satisfy.
- **Wave 2 — Integration 1 (09:00–12:00)**: orchestrator inline: merge commits → ROUTE_READY double-flip commit → full verify (typecheck, 153+ tests, web build) → local E2E script (paste+pdf+docx+png both columns → plan → 3+ session turns incl. follow-up cap + forced failover w/ bogus AGNES key + provider chip label → end early → debrief w/ covered points → save → open `/debrief/[id]` incognito → `?mock=1` journey offline) → preview deploy → promote → prod smoke. Then a **verification Workflow**: parallel Sonnet-high-effort auditors — one per journey edge-state group (20 rows), one theme-consistency reviewer, one adversarial "try to break the receipts chain" agent; confirmed findings fixed inline. **CHECKPOINT 1 (12:00): whole journey live in prod.** Fallback: hold whichever boolean isn't ready — gating copy stays honest by design.
- **Wave 3 (Wed PM)**: D merges when whole; E keyed runs — adjudication-prep over 8 pairs, consistency backgrounded (~90 min, ~$2-4); provider comparison + baseline. **Timothy 19:00–21:30: gold adjudication (pairs 01 + 04 first).** CHECKPOINT 2 (24:00): gold numbers exist.
- **Wave 4 (Thu)**: lever experiments (strict sequence: baseline config → one lever at a time → adopt only if gold holds) → evidence-gated quality fixes (dedupe/missed-cap/kind-mix) → results JSON final → F docs + README table → landing numbers → full verify #2 → prod deploy. **CHECKPOINT 3 (Thu 09:00, Timothy 30 min): lever adopt/reject + approve restated targets. CHECKPOINT 4 (Thu 15:00): product frozen for video.** Thu PM: Timothy+Vedika demo takes; write-up draft from `evals/results/`; feature freeze 22:00.
- **Fri**: video final cut, write-up polish, `gitleaks detect`, BoardingPass rescan, README video link, final smoke, **submit 16:00–18:00 (hard buffer 20:00)**.
- Total eval API budget ≈ $10–15 (~250 structured calls); Claude spend: Sonnet lanes + Sonnet verifiers, Fable only in this loop.

## Verification (the pass/fail gates)

1. `pnpm typecheck` (core+web) · full core vitest (keyed eval suites must SKIP without `RUN_EVALS=1` even with `.env` present) · `pnpm --filter web build`.
2. The Integration-1 E2E script above, locally then on prod.
3. Journey edge-state audit: all 20 rows of `docs/user-journey-2026-07-27.md` demonstrably satisfied (was 10/20).
4. Eval results: every spec-pivot criterion appears in the README table as Target | Measured | Where | Met/Missed/Restated — no criterion silently dropped.
5. Fri: gitleaks clean, CI badge green, saved-debrief link opens cold in incognito.

## Risks

| Risk | Mitigation |
|---|---|
| Session↔debrief seam (`questionId` on candidate turns) | Named in lane B brief; Integration-1 E2E explicitly requires a debrief with covered points |
| Eval numbers under targets | Pre-committed adopt-or-restate policy, decided at Checkpoint 3, never silent |
| Agnes instability during comparison | ~10–20 calls, serialized w/ backoff, report n-achieved; interviewer lane failover already labeled |
| Timothy's time (~3.5h asks) | Pre-filled adjudication sheets; n reported honestly if fewer pairs land |
| Orchestrator context | Self-contained lane briefs; orchestrator only merges/verifies; consistency run backgrounded |
| Landing scope creep | Interim landing is the shippable fallback; D merges only when whole; evidence band ships labeled targets |
| Concurrent lane interference | One-writer-per-file table; no lane runs git or full builds; orchestrator serializes commits |

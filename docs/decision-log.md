# Decision log

Format: `YYYY-MM-DD — decision — one-line rationale`. Standing constraints (the cut
list, receipts-everywhere, execution-as-ground-truth, OpenAI-only runtime) live in
`CLAUDE.md` → "Ground rules".

## 2026-07-12

- Interview Compiler selected on founder-fit / ownership; Legible + MediRead retired to
  the post-hackathon file. (From `docs/spec.md`.)
- TailorTrack research correction — BoardingPass now ships "portfolio + tailor from real
  evidence," so the store-plus-retrieval combo is not unclaimed. Evidence Bank demoted to
  P1 context-paste; resume tailoring made an explicit non-goal. (From `docs/spec.md`.)
- Positioning locked — serve the Interview · OA stage BoardingPass tracks but doesn't
  tool. (From `docs/spec.md`.)
- Stack (v1) — web app; **mobile formally retired** (challenge execution and code editing
  are desktop-native).

## 2026-07-13

- **Phase 0 bootstrap executed** — repo initialized on the personal GitHub account
  `bandengasep`, remote via SSH host alias `github.com-personal`.
- **Doc-drift fix** — `CLAUDE.md` had documented `gh-personal` as an SSH host alias; it is
  actually a zsh `gh auth switch` alias. Real SSH host aliases are `github.com-personal` /
  `github.com-comchord`; CLAUDE.md corrected. (No SSH config change made.)
- **Stack relocked: all-TypeScript.** Dropped the Python/FastAPI backend for a pnpm
  workspace where `packages/core` (TS library) and `web/` (Next.js) share one language.
  Rationale: the builder is Claude (human Python-vs-TS fluency is neutral), and DryRun is a
  typed-receipts pipeline — a single shared Zod schema makes the JD↔resume↔gap contract
  compiler-enforced end to end (no Pydantic↔TS drift at the Vedika handoff) and collapses
  two deploy targets into one. Verified before committing: OpenAI Node SDK has strict
  structured outputs at parity (`responses.parse` + `zodTextFormat`); the SQL sandbox runs
  in Node (`@duckdb/node-api` / `better-sqlite3` + vitest). Decided at bootstrap, before any
  feature code, so switch cost was ~zero. Design: `docs/superpowers/specs/2026-07-13-stack-language-design.md`.
- **Phase 0 closed out.** All bootstrap "done when" items satisfied: repo public on
  `bandengasep`; `timothy` / `vedika` branches tracking origin (both fast-forwarded to the
  all-TS `main`); Vedika (`veduvin00`) is a collaborator; CI green on `main`; secret scanning +
  push protection on; `protect-main` active requiring a PR and the `verify` status check. The
  Phase 0 section has been removed from `CLAUDE.md`.

## 2026-07-21

- **AGENTS.md made the canonical ops doc; CLAUDE.md is now a one-line `@AGENTS.md` import.**
  Verified against current docs: Claude Code reads only CLAUDE.md natively (no AGENTS.md
  support) but supports `@path` imports — zero-drift setup for Vedika's non-Claude tooling.
- **Parser receipts strategy locked:** models emit verbatim quotes, never char offsets
  (models can't count characters); spans are computed by a deterministic locator
  (`packages/core/src/parsers/spans.ts`), and unlocatable quotes surface in a `dropped`
  array — never silently discarded — which is the raw input for the citation-validity eval.
- **`openai@^6.48.0` added to `packages/core`** (verified: peer `zod ^3.25 || ^4.0`,
  compatible with our zod 4.4.3); `@types/node` added dev-only. Both within stack lock.
- **`.env.example` Supabase var renamed to `SUPABASE_SECRET_KEY`** — Supabase's new API-key
  scheme replaces `service_role`→secret (`sb_secret_...`) and `anon`→publishable; all our
  access is server-side, so we carry only the secret key. (Verified via Context7.)
- **Vedika's FE V0 arrived on `dryrun-FE-V0`** (clean vs `origin/main`; web/-only + lockfile).
  PR opened to `main`. ⚠️ `results/page.tsx` readiness bar (`READINESS_PERCENT = 65`) is a
  cut-list violation — flagged as a merge blocker; Vedika swaps it on her branch.
- **PR #4 merged with the readiness bar still in** (Timothy's call, same day). The violation
  now lives on `main`; tracked as a follow-up for Vedika — must be gone before the demo/video.
- **Commit 1 adversarially reviewed before PR** (43-agent workflow: 4 lenses × 3 verifiers per
  finding). 13 raw findings → 6 confirmed → all fixed: locateSpan word-boundary preference
  (receipts were citing "SQL" inside "MySQL"), restored the compile-time no-Node-builtins-in-src
  guard (split test tsconfig), closed parseResume dropped/refusal + duplicate-quote test holes.
- **Commit 2 shipped (PR #6) — `Gap` schema FROZEN for the FE from here.** Breaking changes now
  require a decision-log entry + a ping to Vedika. Merged pre-review at Timothy's call; the
  adversarial review ran after merge (first run crippled by a Claude spend-limit hit — 32/34
  agents errored, resumed after the limit raise; unverified findings were treated as open, not
  rejected). Actioned from it: cosineTopK `k<=0` clamp (slice(0,-1) footgun), stage-1 wiring +
  empty-resume + duplicate-verdict test pins, and this docs pass.
- **`lib: ["ES2022","DOM"]` on the core src program** (retroactive log, shipped in PR #6) — the
  openai SDK's types need web-platform globals; DOM lib is the isomorphic-correct source for a
  library that must bundle for web. The no-Node-builtins guard was probe-verified unaffected.
- **`web/` gains a direct `openai` dependency** (PR #6) — the compile route constructs the client
  it injects into core; core keeps the client-injection seam and stays constructor-free.
- **Commit 3: `better-sqlite3` chosen over `@duckdb/node-api`** — synchronous API gives a clean
  ephemeral per-run lifecycle; SQLite window functions (3.25+) cover analyst-level SQL. DuckDB
  reconsidered post-hackathon only if challenge SQL outgrows SQLite.
- **Harness is the sanctioned Node-only zone of core:** `src/harness/` excluded from the
  isomorphic src guard program, not exported from the barrel; consumers use the subpath export
  `@dryrun/core/harness`. `allowBuilds: better-sqlite3: true` set in pnpm-workspace.yaml.
- **Harness ship-gate:** a `ChallengeSpec` must include a test whose `sql` equals `referenceSql`
  (an unverified reference solution cannot ship) — enforced by `HarnessError`, not convention.
  CI gains a named "Challenge executability" step.
- **Receipts contract tightened (PR #7): a gap's resume citation must come from that
  requirement's candidate set** — the lines the adjudicator was actually shown. A merely-real
  resume line no longer suffices (evidence never in evidence is not a receipt); violations
  fail loud as `DiffError`. Found by inline review after both workflow review runs died on the
  Claude spend limit; re-verified live on all 3 fixture pairs under the stricter guard. Same
  commit: embedding vectors keyed by `data[].index` per API contract instead of array order.
- **Local-dev secrets convention:** `web/.env.local` (gitignored via `.env.*`) carries the key
  for `next dev`; it is a copy of root `.env`. Final-week gitleaks sweep should know both exist.

## 2026-07-26

- **FULL PIVOT: DryRun becomes an interview-rehearsal compiler** — compile → session plan
  (receipt-carrying questions) → live AI-interviewer mock → debrief that quotes the candidate's
  own transcript. Timothy's call, made against explicit counsel to keep SQL-first, after (a) the
  vague-JD concern (real postings mix concrete tool lines with soft competency lines; question
  prep generalizes across both, SQL drills only fire on the concrete subset), (b) verifying the
  Launchpad rubric verbatim (judges' final question: "would you interview the applicant"), and
  (c) verifying sponsor fit (Agnes AI prize lane; VideoDB credits in hand). Alternative named
  and parked *built*: the SQL harness + CI executability gate stay in-repo, dormant and green
  — the challenge *generator* moves to post-hackathon. Gap engine survives untouched as the
  personalization brain. Full plan: `docs/superpowers/plans/2026-07-26-pivot-interview-rehearsal.md`.
  (Attribution note: the pre-pivot ground rules/cut list were Timothy's own 12-Jul close-out,
  superseded today by his decision — not constraints imposed by anyone else.)

## 2026-07-27

- **Theme relocked: "Reading Room daylight" replaces the dark navy/cyan identity** — Timothy's
  call ("softer"), decided from two Paper style tiles (soft-dark "Fog Study" vs soft-light
  "Reading Room") plus two accent/ground iterations. Final: cool paper ground `#F5F7FB` (landing
  hero gradient `#EDF1F7→#FFFFFF` — cooled specifically to avoid reading as Anthropic-cream),
  white surfaces, hairline `#DEE4ED`, ink text `#1D2127`, fountain-pen-blue primary `#2E4C8F`,
  status coral/ochre/moss `#C05353/#A87E2F/#3E7D63`; Fraunces (display) + Instrument Sans (UI) +
  Google Sans Code (evidence voice, unchanged). Rationale: receipts-are-paper metaphor made
  visible; differentiation from the uniformly dark AI-tool field; light UIs read better in
  compressed demo video. All 48 Paper tokens re-pointed and the four app artboards repainted +
  screenshot-verified; Paper file "Dryrun-WebApp" is the single source of truth for `globals.css`.
- **Framer's role settled: measured reference only, hosting stays Vercel-only.** The remixed
  free "Message" template (Arthur Duchesne) supplies the landing's layout/spacing/section system
  as a serialized spec; Framer cannot export code, so nothing deploys there. Its fake-content
  sections are replaced on port: pricing → eval-numbers band, testimonials → labeled sample
  debrief (fabricated social proof would breach the Honesty pillar).
- **Stay on `openai@^6`; no Vercel AI SDK migration.** Researched against current docs: OpenAI's
  recommended path is exactly what's shipped (Responses API + strict structured outputs, typed
  streaming events); the AI SDK inserts its own Zod→JSON-schema conversion with documented
  OpenAI-specific incompatibilities — re-validating five wire schemas at T-5 days with no eval
  net is pure risk; its unique win (partial-object streaming to React) isn't needed.
- **Agnes AI joins as second provider through the existing client-injection seam**
  (`new OpenAI({ baseURL: AGNES_BASE_URL })`); interviewer lane defaults to Agnes
  (`agnes-2.0-flash`) with per-request failover to OpenAI, labeled in the UI. GMI Cloud parked
  (no key). "Runtime = OpenAI only" relaxes to "runtime = OpenAI-compatible endpoints, keys in hand."
- **LinkedIn permanently parked out of runtime.** Verified against stickerdaniel/linkedin-mcp-server's
  own README: needs a persistent local Chromium + cookie session (not serverless-deployable) and
  LinkedIn's UA prohibits automated access (ban risk). Dev-side MCP use for fixture gathering stays fine.
- **Two-step compile** (`/api/compile` gaps → `/api/plan` questions): gaps render ~30s sooner, the
  diff stays a first-class demo artifact, a plan retry doesn't re-buy two parses.
- **Interviewer turn = `chat.completions` streaming + trailing `META:` sentinel line** (action:
  ask_followup|advance|wrap_up, fail-soft, mid-text META inert): the OpenAI-compatible lowest
  common denominator so the turn runs on Agnes; core owns prompt+protocol (`src/session`), web owns
  transport. **The client is the state machine** (questionIndex, follow-up cap 2, wrap-up).
- **Session state is client-held; no DB.** Routes stateless; `{plan, transcript}` re-sent per turn;
  sessionStorage bridge (`dryrun-session-v1`, per-tab). Honest "nothing stored server-side" stance;
  pgvector/Supabase stay out entirely.
- **Video answers: direct-to-VideoDB upload via server-minted URL, never proxied** (~4.5MB Vercel
  body cap). `turn.text` built only by `joinTimedWords` so debrief-quote spans map to timestamps by
  exact arithmetic, never model-emitted. **Feature-flagged with a hard Wed 29 Jul 15:00 go/no-go**;
  on no-go the session ships text-only and the debrief loses only timestamps. `videodb` (web/ only)
  is the sole new dependency.
- **Eval targets locked before building** (Problem pillar: "success criteria defined before you
  built") — numbers in `docs/spec-pivot-2026-07-26.md`; corpus grows to 13 pairs (Timothy's CareerGO
  exports, incl. the Venture BI/AI internship as fixture-04), gold sets hand-adjudicated Wed.
- **`/results` and `/compiler/[lang]` deleted** with the pivot — closing the 21-Jul readiness-bar
  cut-list violation and removing the fake always-pass Run button (both were Honesty-pillar
  liabilities). False "runs entirely on-device" landing/compile copy dies in the same pass.
- **Supabase persistence added as explicit "Save & share debrief" (evening addendum) — Timothy's
  call, made against the no-DB recommendation.** Scope hard-limited: in-flight session state stays
  client-held (sessionStorage); the one server write is a user-clicked save of
  `{plan, transcript, debrief}` into a single `sessions` table (uuid pk) via `@supabase/supabase-js`
  server-side, returning a read-only shareable `/debrief/[id]`. No accounts, no RLS, no pgvector
  (still cut). Rationale for accepting: turns persistence into a demo asset (judges can open a live
  debrief URL) while the honesty stance survives as "nothing stored unless you click Save; anyone
  with the link can view." Slots: table+save route Wed PM, share page Thu AM. Second sanctioned
  web-only dep: `@supabase/supabase-js`. Paper design pass also pulled forward from Mon to Sun eve
  (this session), so Monday's FE session starts at code. Env scaffold landed same evening
  (`.env.example` gains Agnes/VideoDB/optional names; real files carry empty lines for Timothy).

### Verify sprint (Mon 27 Jul AM, ~45 min, before any code)

- **Agnes serves `/v1/responses` — but it SILENTLY IGNORES `text.format` json_schema. Do not use
  `responses.parse` on Agnes.** Measured, not assumed: `POST /v1/responses` with a strict
  `json_schema` format returns HTTP 200 and free prose (`"\n\nYes, during daylight hours the sky
  typically appears blue…"`), reproduced 3/3 with two different schemas. Through the SDK this
  surfaces as `responses.parse` throwing `SyntaxError: Unexpected token 'Y' … is not valid JSON` —
  it fails loudly client-side, but the endpoint's 200 means schema support cannot be probed by
  status code. Its `/responses` output also carries a `reasoning` item (`reasoning_text`) before
  the `message` item. **Consequence:** the plan's contingency is now the primary path — every
  Agnes structured call goes through `chat.completions` + `response_format: {type: "json_schema",
  json_schema: {name, strict: true, schema}}`, which *is* honored (returned exactly
  schema-conforming JSON; round-tripped through `z.toJSONSchema(Wire, { io: "output" })` and
  re-validated with Zod: pass). This is the Thursday OpenAI-vs-Agnes plan-compile comparison's
  adapter shape. The interviewer lane was already specced on `chat.completions`, so it is unaffected.
- **Agnes model catalog (`GET /v1/models`, 5 models):** `agnes-2.0-flash`, `agnes-2.5-pro-alpha`,
  `agnes-image-2.0-flash`, `agnes-image-2.1-flash`, `agnes-video-v2.0` — all
  `supported_endpoint_types: ["openai"]`. `agnes-2.0-flash` stays the interviewer default.
- **`openai@6` `chat.completions.create({stream: true})` verified against BOTH providers**, same
  chunk shape: first chunk `delta.role` with empty content, then `delta.content` string deltas,
  then a `finish_reason: "stop"` chunk with empty delta, then — with
  `stream_options: {include_usage: true}` — a **final usage-only chunk** (`choices[0].delta` empty,
  `usage` populated) before `[DONE]`. So cost capture must read `usage` off the *last* chunk, not
  the finish_reason one. Agnes returns `{prompt,completion,total}_tokens` +
  `completion_tokens_details.reasoning_tokens`.
- **Latency finding that changes the failover config — measured, and it cuts toward Agnes.**
  First-token on the interviewer prompt: **Agnes `agnes-2.0-flash` 1235 ms** vs **OpenAI
  `gpt-5-mini` 4371 ms**. The gap is reasoning tokens: gpt-5-mini burned 256 of them before
  emitting any text, blowing the locked ≤3s first-turn-token criterion. Retested with
  `reasoning_effort` — `"minimal"` → **1158 ms / 0 reasoning tokens**, `"low"` → 1697 ms / 128.
  **Decision: the OpenAI failover lane pins `reasoning_effort: "minimal"`** so failover still meets
  the ≤3s bar; default (medium) would fail it. Independently, this is the first measured evidence
  for the Agnes-owns-the-interviewer-lane decision — a latency number, not a prize-lane assertion.
  (Receipts-critical structured calls stay on OpenAI strict SO regardless; that lane is untimed by
  the ≤3s criterion.)

### First end-to-end measurements (Mon 27 Jul, dev server on localhost, gpt-5-mini)

Recorded because the Evidence pillar wants numbers taken before they are convenient,
and two of these miss targets that were locked on 26 Jul.

- **Full chain works.** `/api/compile` (SSE) → `/api/plan` → `SessionPlan`, on fixture
  pair 01: 23 requirements, 53 resume lines, **0 dropped quotes**, 23 gaps
  (8 strong_differentiator / 8 weak_evidence / 7 missing_skill), then 6 questions,
  **all 6 grounded in a real gap** and every one satisfying the kind↔STAR biconditional.
  Every gap's `jdSpan` and `resumeSpan` slices back to its own text — the receipts
  invariant re-checked against the source, not asserted.
- **SSE framing verified against a real stream, not a mock.** First `stage` frame arrived
  at **0.08s** (no buffering on the dev path), heartbeat comments landed at exactly 10s
  intervals through the two long silent stretches, and `readSSE` reconstructed all four
  stage events + the result when the captured bytes were replayed in **7-byte chunks**
  (i.e. with frames deliberately split mid-boundary). Result re-validated as
  `CompileResult`. Vercel's buffering behaviour is still unverified — that needs the
  Tuesday preview deploy; localhost cannot prove it.
- **⚠ LATENCY MISSES TARGET — the day's most important finding.** Measured:
  | run | compile | plan |
  |---|---|---|
  | fixture pair 01 (23 reqs) | **80.5s** | **33.4s** |
  | Venture BI/AI JD (35 reqs) | **146.3s** | not run |
  Locked targets are compile p50 ≤60s and plan ≤20s. Both missed, and the real target
  JD — the one the demo video opens on — missed by 2.4×. These are single dev-mode runs,
  not a p50, but model latency dominates so production is unlikely to rescue it.
  Identified lever, NOT yet applied: `reasoning_effort` on the structured lane, the same
  knob that cut interviewer first-token from 4371ms to 1158ms. It is deliberately left
  alone pending Timothy's call, because unlike the interviewer lane these are the
  receipts-critical calls — trading reasoning for speed here could move gap precision/
  recall, and Thursday's gold sets are the only honest arbiter of that. Options, in
  preference order: (a) measure `reasoning_effort:"low"` on parse+diff against the gold
  sets Thursday and adopt only if precision/recall hold; (b) split the JD parse into
  concurrent chunks; (c) restate the target with the measurement, which the rubric
  explicitly rewards over a quietly-missed number.
- **⚠ Deploy-tier risk, newly load-bearing.** There is no DryRun project on Vercel yet
  (team `timothy-hartanto-projects` has only `arsenal-world-cup-hub` and
  `nbs-candidate-portal`). `/api/compile` declares `maxDuration = 300`, which requires
  Fluid/Pro; on a Hobby-tier function cap a 146s compile is killed outright. This must be
  settled before Tuesday's preview deploy, and it is now a demo blocker rather than a
  detail.
- **Gap redundancy observed (quality, not correctness).** The JD line "Build and maintain
  SQL models and dashboards for funnel, retention and campaign analytics" parsed into two
  atomic requirements, which produced two gaps sharing one `jdSpan`, which produced two
  near-duplicate questions (q-1, q-2). Not a guard violation — both are properly grounded —
  but it spends 2 of 6 question slots on one JD line. Candidate fix (post-measurement):
  dedupe questions by `jdSpan.start` in the plan compiler. Logged for Thursday rather than
  patched blind.
- **Question-kind distribution skews behavioral**: 5 behavioral / 1 conceptual, against 7
  missing_skill gaps that the policy says should yield conceptual questions. Worth watching
  in the eval; the guard only enforces the STAR biconditional, not the kind mix.

## 2026-07-28

- **Vercel deploy landed; SSE buffering risk (plan risk #3) CLOSED by measurement.** Against
  production `dryrun-web-pi.vercel.app`: first `stage` frame at **0.64s**, heartbeat comments
  arriving live at 10s intervals through both silent stretches, `result` at 99.65s — frames
  arrive as they happen, so Vercel is not buffering the stream. The `Cache-Control:
  no-transform` + `X-Accel-Buffering: no` headers are sufficient, and SSE runs fine on the
  plain Node runtime (Edge buys nothing — confirmed in Vercel's own function docs).
- **Fluid Compute does not, and cannot, fix DryRun's latency — recorded so nobody re-opens it.**
  The 99s compile is gpt-5-mini inference; the function is idle awaiting a third party. What
  Fluid does give us, all of it already default: **300s max duration on every plan** (Hobby
  caps at 300, Pro at 800), which retires the "maxDuration=300 needs a paid upgrade" blocker
  raised on 27 Jul; **Active CPU pricing**, which bills only while the CPU works, so ~99% of a
  compile's wall time is billed at the low memory-only rate; and bytecode caching for cold
  starts. Also learned: **request bodies are 100MB on Fluid, not 4.5MB** — the figure the
  "never proxy video uploads" decision was built on is outdated. That decision stands on its
  own merits (client-direct upload is still better), but the stated reason needs correcting.
  Latency levers are therefore all model-side: `reasoning_effort` on parse/diff, the already-
  defined `FALLBACK_MODEL` (`gpt-4.1-mini`, non-reasoning) for the parsers, or chunking the JD
  parse (66s of the 99s). All three trade against gap quality → deferred to Thursday's gold sets.
- **JD-by-URL cut before it was built, on evidence.** Measured with a browser User-Agent:
  NBS CareerGO — the posting the demo video opens on — returns **HTTP 302 to a login wall**
  (145 words, all of it the login page); Lever returns a 297KB JS shell with 30 words;
  Greenhouse redirects to a board index. LinkedIn was already parked (rule 6). A URL box would
  fail on our own demo posting and on the most recognizable job sites. → `post-hackathon-ideas.md`.
- **Screenshot ingestion accepted, but vision is never the source of record.** Timothy's
  workaround for the login wall is a full-page PNG, so images become a supported input. Measured
  `gpt-5-mini` transcription of a rendered JD page against known source text: **10 of 49 lines
  verbatim**, `Intern – BI/AI` (en-dash) → `Intern - BI/AI` (hyphen), and one paragraph split
  into three lines reproducing the page's visual wrapping. The danger this exposes is specific:
  feeding vision output into `sourceText` leaves the span invariant **passing** while every
  receipt quotes text no employer wrote — a green check over a false claim. Structural answer:
  **all extracted text lands in the editable textarea and the user presses Compile**, so the
  source of record is always human-confirmed. Applies to every upload mode, one code path.
  (Bonus robustness datum: an accidental all-black render returned "I can't detect any text in
  this image" rather than a fabricated posting — kept as a regression check.)
- **PDF/DOCX/image ingestion approved for BOTH the JD and resume inputs**, client-side, via
  `pdfjs-dist` + `mammoth` (web/ only; core stays free of them — ground rule 9 sign-off from
  Timothy). Design: `docs/superpowers/specs/2026-07-28-document-ingestion-design.md`.
- **Agnes rejects a system-only messages array — found by live smoke, fixed in core.**
  `400 {"message":"No user query found in messages."}` where OpenAI accepts the same payload.
  The first turn of every interview has an empty transcript, so `buildInterviewerMessages`
  returned exactly one system message and **every opening question silently failed over to
  OpenAI** — losing the Agnes lane at precisely the moment the demo is watching. Fix:
  `KICKOFF_USER_MESSAGE`, a bracketed stage direction (`"(The candidate is ready. Ask your
  question.)"`) appended as a `user` message whenever the transcript holds no candidate turn.
  Deliberately not first-person and never written into the transcript, so the debrief — which
  quotes candidate turns verbatim — can never pick it up. After the fix the turn route reports
  `provider: agnes, failover: false`. This is the second Agnes-vs-OpenAI incompatibility found
  by measurement rather than docs; both were invisible to schema/type checking.
- **⚠ First-turn-token target missed on BOTH providers.** Locked target ≤3s. Measured through
  the route (dev server, 562-token prompt): Agnes **6.25s / 6.14s / 0.55s** across three
  identical runs — the outlier looks like gateway-side caching, so ~6.2s is the honest figure.
  The earlier 1.235s direct probe used a 265-token prompt, so the system prompt's size is
  implicated. Cheapest untried lever is trimming the interviewer system prompt (currently
  ~1.2k chars incl. gap receipts). Recorded rather than quietly re-baselined; the failover lane
  already pins `reasoning_effort:"minimal"` for the same reason.
- **Debrief, session-turn and save routes landed; `sessions` RLS verified by probe, not assumed.**
  The table Timothy created has RLS enabled with **no policies**, which is the right shape for
  this design: the publishable key can neither read nor write, so every access is mediated
  server-side by `SUPABASE_SECRET_KEY`. Verified against the live project rather than reasoned
  about — anon `GET /rest/v1/sessions?id=eq.<real id>` returns `[]` and anon `POST` returns
  **401**, while the server route saved and returned a shareable id in 2.1s. "Anyone with the
  link can view" is therefore a property of our route's behaviour, not of a public table policy
  that could later be widened by accident. Write-once: no update or delete path exists, so a
  shared link cannot be altered after it is handed out.
## 2026-07-31

- **Freeze exception opened (Timothy's call) — a latency program plus the gap display cap;
  everything below shipped the same night behind flags and the product re-freezes for Saturday's
  recording once prod probes land.** Driver: dissatisfaction with compile 99.65s / first-turn
  ~6.2s ahead of the Sunday-23:59 extension.
- **Lever policy REVISED (Timothy's call, supersedes the 30-Jul no-gold branch):**
  quality-neutral levers adopt on latency measurement alone; behavior-changing levers adopt only
  if the mechanical suites hold on re-run (consistency Jaccard ≥0.6, pre-guard grounding ≥95%,
  guard-rejection rate comparable to baseline). Gold stays not-measured and disclosed — the gate
  changed from "gold or nothing" to "mechanical evidence, disclosed limits."
- **Framework migration for latency REJECTED, doc-verified same day** (context7: AI SDK =
  unified provider API; LangGraph = stateful orchestration; Mastra = workflows/agents/RAG).
  They are wiring layers around the same API calls; ~96% of compile wall time is model
  inference. Zero seconds available from a rewrite that would re-validate five wire schemas at
  T-2 days. Reaffirms rule 4 and the 27-Jul AI SDK adjudication.
- **reasoning_effort levers REJECTED on mechanical evidence alone** (`latency-program-2026-07-31.json`):
  full `low` hit ~57s but tripped the diff citation guard 1/3 + 2/4; `minimal` hit 31–35s **by
  collapsing requirement extraction** (pair-01: 13–16 JD lines vs baseline's ~22–29) — speed
  bought by reading less of the JD. The physics: parse latency is output-token-bound
  (verbatim-quote receipts × requirement count), so effort knobs can only accelerate extraction
  by extracting less. The suite was hardened mid-program to record guard rejections as data
  (rejection rate is now a first-class metric) instead of crashing — round 1 died mid-flight and
  lost its usage data by throwing.
- **MODEL ADOPTED: `gpt-5.6-luna` for the entire structured lane, debrief included (Timothy's
  call), env-flagged `OPENAI_STRUCTURED_MODEL`; kill switch = unset + redeploy (mic-rung
  pattern).** Probes: 24–41s full-chain vs baseline 117–151s same-machine; local route probes
  compile **17s** / plan **8s**. Gates: consistency Jaccard **0.881** (pair-01, 20/20 runs, gap
  count perfectly stable at 26×20) / **0.770** (pair-04, 17/20) vs ≥0.6; pre-guard grounding
  **30/30**; STAR 100%. Disclosed, not smoothed: pair-04 guard rejections 3/20 vs baseline's
  2/20 (small-n); pair-01 duplicate-question groups larger (the known jdSpan-dedupe issue,
  likely amplified by luna's more granular parse); debrief rides its built-in locateSpan
  validator + visible `dropped[]` rather than a dedicated re-gate; cost ≈$0.026→≈$0.035/compile
  at the posted $1/$6 rate — still under the ≤$0.05 target, invoice sanity-check pending.
  `gpt-5.4-mini` probed faster still (16–27s) but showed a lighter resume parse (cv 11 vs ~15)
  and 1/4 rejections — banked as the fallback candidate, not adopted.
- **Compile route gains ONE announced diff retry on `DiffError`.** A live probe hit a
  fresh-parse citation-guard rejection (~1 in 10 whole-chain incidence across models). The
  retry is emitted in the SSE trace (`retry: true` + the guard's reason) — the guard catching an
  invalid citation is demo material, not something to hide — and a second rejection still fails
  loud.
- **Two more levers shipped DARK:** `OPENAI_SERVICE_TIER` (priority/flex serving speed,
  quality-neutral, the echoed tier in the response body is the receipt) — unneeded post-luna but
  available; and the **Agnes plan lane** (`PLAN_PROVIDER`, default openai): the eval adapter
  promoted into core as `compileSessionPlanViaChat` with prompt/guards extracted to
  `plan/shared.ts` so both transports run identical guards, route failover labeled in the
  response envelope. Not flipped — luna meets the plan target on the receipts lane; the Agnes
  path remains the measured provider exhibit.
- **Interviewer prompt trimmed ~41%** (through-route prompt 562→~470 tokens), META protocol
  byte-identical, all 20 session tests unmodified. **First-turn ≤3s STILL MISSED**: through-route
  Agnes first-data 39.2/10.1/6.1s tonight — gateway-bound, not prompt-bound. The Agnes
  interviewer lane stays (prize lane, honest label, failover pins `reasoning_effort: minimal`);
  the target is restated with tonight's numbers.
- **Gap display cap shipped: top 10 by kind priority (missing_skill → weak_evidence →
  strong_differentiator), "Show all N gaps" expander, count strip keeps the full census.**
  Render-only — pipeline, payloads, and banked evals untouched (Timothy asked for 7–10; on
  fixtures, 51% of rows were strong_differentiator strengths). The landing EvidenceBand's stale
  "measured Thursday" rows update from `evals/results/` after prod probes.
- **gitleaks over full history: CLEAN** (76 commits, no findings; tool installed tonight, no
  repo config — default ruleset). `.envrc` and `.vercel/` added to .gitignore — the `.env.*`
  pattern matches neither, so a direnv file or CLI link could have been committed by accident.
- **Prod probes (post-merge deploy of PR #18, `OPENAI_STRUCTURED_MODEL` live) — three latency
  targets flip to Met; PRODUCT RE-FROZEN.** Compile 16.6 / 19.1 / 40.5s (fixture; the 40.5s run
  was guard-rejected, retried, and the retry rejected too — correlated within one marginal
  parse, failed loud) · **40.4 / 44.5s real Venture JD** (was 146.3s) · plan **11.0 / 9.4s** ·
  first-turn 9.2 / 6.9s (missed, restated — gateway-bound) · debrief **6.9s** with 4/4 quotes
  mechanically slice-valid, 0 dropped. Disclosed incidence: ~1-in-5 whole-chain runs on the
  rejection-prone fixture fail loud at the citation guard (~1-in-10 overall observed);
  a rejected compile re-runs in ~20s. EvidenceBand, README table, and the write-up carry these
  numbers as of this entry. **Re-freeze declared: Vedika records Saturday against this build;
  remaining work is submission materials only** (write-up polish, video, README links, final
  smoke, and Timothy's direct BoardingPass URL check).
- **Final-week rescan executed: no new interview-rehearsal entrants found for July 2026**
  (Product Hunt, launch aggregators, incumbents — a real zero-hits signal; Google Interview
  Warmup was discontinued in April 2026). **BoardingPass itself is UNRESOLVED, not negative:**
  its product site could not be located by search this session; flagged for a direct check via
  the original 12-Jul URL rather than treating "not found by search" as "not shipped." Pitch
  unchanged per the pre-committed branch.

## 2026-07-30

- **LLM adjudication of the gold sets REJECTED; Codex verdicts reverted and the derived score
  deleted.** Timothy delegated gold adjudication to ChatGPT Codex while sick, then reverted it
  on the circularity concern ("ChatGPT measuring against ChatGPT") — the right call, and the
  data agreed: Codex filled 168/168 verdicts but **zero missedRequirements on all five pairs**
  (making recall a fake 1.0 by construction — the "what did the engine miss" half of the task
  requires reading the JD independently and was silently skipped) plus a 28/28 rubber-stamp on
  the worst-match pair. The contaminated `gold-score-2026-07-29.json` (precision 0.744 /
  recall 1.0) was deleted rather than committed. Gold remains defined as HUMAN-adjudicated;
  Codex's pass may be reused as disclosed triage (human reviews the 27 disagreements + samples
  the agrees + fills missed requirements) once Timothy is well. Deadline extension to Sun 2 Aug
  (announced 30 Jul) makes this comfortable.
- **Langfuse integrated — tracing, prompt registration, and eval scores** (built docs-first on
  SDK v4: `@langfuse/openai` `observeOpenAI` at the client-injection seam in `providers.ts`,
  `LangfuseSpanProcessor` registered in Next's `instrumentation.ts`, explicit `forceFlush()` in
  every LLM route incl. after SSE streams complete). Design decisions:
  (a) **Production traces MASK document bodies** — strings >~200 chars redact to
  `[masked: N chars]`. Rationale: JD/resume/answers are PII and the product's stance is
  "nothing stored unless you save"; observability must not quietly violate it. Eval runs on our
  own fixtures set `LANGFUSE_TRACE_FULL_IO=1` and trace fully. Usage/model/latency always visible.
  (b) **Prompts registered, not runtime-fetched**: `dryrun/plan-compile`, `dryrun/interviewer`,
  `dryrun/debrief-compile` live in Langfuse versioned + labeled `production`
  (`web/scripts/langfuse-push-prompts.ts`), but the demo path keeps in-code prompts — no new
  network dependency before submission. Runtime fetching is post-hackathon.
  (c) Per-call traces (3 well-tagged traces per compile) over one nested request-trace —
  lower risk with the streaming architecture; revisit later.
  (d) `packages/core/src/` stays Langfuse-free — the seam did its job; eval-side usage is
  devDependency-only in `test/evals/`. `stream.ts` split (`sse-response.ts`) keeps OTEL's
  grpc/tls out of the browser bundle — found by a keyless `next build` breaking, fixed, both
  builds verified green. Eval suites now push headline numbers as Langfuse scores.
  ⚠ Prod traces need `LANGFUSE_*` env vars added to the Vercel project (Timothy, dashboard, 2 min).
- **Competitive rescan: LinkedIn Premium's AI Role Play found — pitch stays STANDALONE; no pivot,
  no fold-in; mic dictation waits behind an evidence gate.** Timothy surfaced LinkedIn Learning's
  AI Role Play (30 Jul screenshots + docs: interview role-play scoped to a skill/course, voice or
  text, post-session Strengths/Areas-of-Improvement assessment plus course recommendations,
  accuracy handled by a "powered by AI and may make mistakes" disclaimer, Premium-gated; refs:
  Microsoft Support "AI-powered LinkedIn role play", UChicago Academic Tech overview 2026-06-03).
  This executes the AGENTS final-week "rescan for newly shipped interview-prep features" item for
  LinkedIn (BoardingPass rescan still pending Fri/Sat), and the pre-committed response applied:
  narrow the pitch, don't pivot. Adjudication — all Timothy's calls, 30 Jul brainstorm session:
  (a) **Four "fold their feature in" readings rejected on pre-committed grounds**: literal
  integration (no public API; runtime LinkedIn is cut-listed — ToS + serverless-infeasible,
  26 Jul) · voice parity via the Realtime speech-to-speech API (banned, credit trap, rule 4) ·
  LinkedIn JD/profile import (same cut-list line) · adopting strengths/weaknesses assessment
  (violates the named no-scores stance).
  (b) **Pitch stays standalone.** DryRun does not define itself against LinkedIn in any headline;
  the brand appears exactly once — write-up Problem section, as demand proof. Approach names the
  *pattern* ("assess-and-advise interview coaches": AI-asserted judgment behind a disclaimer) as
  the rejected alternative, brand-free — satisfying "alternatives named" without a second mention.
  No landing FAQ comparison, no README pitch change, no video comparison beat; the video keeps its
  planned arc (open on the real Venture-JD compile, close on baseline-vs-ours numbers).
  (c) **VideoDB video-answers lane stays NO-GO** — re-examined fairly (substrate consumers now
  exist; deadline extended) and re-rejected: the rule-5 SDK verification was never done, the full
  rung costs 10–15h against a fully allocated budget, and reversing an evidence-based no-go ~24h
  before submission would convert the Constraints/Honesty exhibit into its opposite.
  (d) **Mic dictation = gated stretch**: browser `webkitSpeechRecognition` (Chrome/Edge/Safari;
  Firefox unshipped) → transcribed speech lands as an **editable draft** in the session composer —
  review-before-send keeps the receipts chain intact, the same honesty pattern as document
  extraction. Feature-flagged `NEXT_PUBLIC_ENABLE_MIC`, honest cloud-STT disclosure line near the
  button. Builds Friday PM ONLY after the uncitedRate audit + README eval table + F-cleanups land
  and gold adjudication is on track; hard revert/flag-off if not E2E-green by Fri 22:00 — Vedika
  records Saturday against a frozen, verified build. If the gate never opens, the sketch lives in
  post-hackathon-ideas as Trajectory material.
  **Write-up notes (for the drafting session)**: Problem = one sentence citing LinkedIn's launch
  as mainstream demand proof; Approach = assess-and-advise as the named rejected alternative
  (disclaimer vs. mechanical validation); Constraints/Honesty = voice-modality gap stated plainly,
  video no-go framed as the gate working; if the mic rung ships, it is described as an unevaluated
  input convenience, never an evaluated surface. The wedge axes that survive contact are the
  measured ones: specificity (compiled from THE JD × YOUR resume), provenance (question → gapId →
  JD + resume spans, 100% grounding), verifiability (locateSpan-validated quotes + visible
  `dropped[]`).

- **Gold adjudication DESCOPED — reported as not-measured, never faked.** Timothy's call (30 Jul
  eve): ill (sore throat ruled out even the dictation workflow), and the extension hours are
  consumed by the remaining evidence/freeze lanes. AI adjudication was declined twice this week
  (Codex reverted 30 Jul; Claude declined same day when asked directly) — the standing rule is
  gold stays HUMAN or UNMEASURED, never synthetic. Consequences, all pre-committed branches:
  (a) README criterion row becomes "gold precision/recall: not measured — descoped; adjudication
  protocol, grouped review sheets, and strict taxonomy validation are committed and CI-green"
  (the infrastructure is the Trajectory exhibit; first post-deadline task).
  (b) Latency levers are NOT adopted — the lever policy's no-gold branch applies: targets
  restated with measurements (compile ~100–146s vs ≤60s, first-token ~6.2s vs ≤3s).
  (c) Micro-adjudication stays open, not owed: pair-01 alone (22 requirements, typed not spoken,
  ~15 min) would revive the row as "n=1 pair, disclosed" if energy appears Fri/Sat.
  (d) The engine-verbosity finding stands on mechanical evidence alone: 168 gaps collapse to 89
  distinct JD requirements; pair-05 is 53 gaps over 18 requirements with one kitchen-sink skills
  line accounting for 16 — the dedupe lever's motivating exhibit, no gold needed.
- **Shipped and FROZEN (Thu eve, PR #17 merged, prod-verified).** The day's full ledger landed on
  main in one PR: baseline audit tooling + re-run, gold taxonomy validator + grouped review
  sheets, README Evidence table, F-cleanups (route-level Langfuse trace names via
  `propagateAttributes` — verified by a live probe producing a NAMED prod trace; compile's dead
  TEMP JSON branch deleted; turn-route wire docs corrected; AGENTS layout un-drifted), and the
  **mic-dictation rung** behind `NEXT_PUBLIC_ENABLE_MIC` (built by a Sonnet lane, orchestrator-
  reviewed): final segments land as editable draft text — review-before-send keeps the debrief's
  quote validation honest — with a cloud-STT disclosure while listening; compiled away entirely
  when the flag is unset. **Kill switch = unset the Vercel env var + redeploy** (the pre-committed
  Fri-22:00 revert path). Mic ships explicitly as an UNEVALUATED input convenience. CI green
  (203 core tests), web build green both flag states, prod deploy flipped and probe-confirmed.
  **Product is frozen for Saturday's recording; all remaining work is submission materials**
  (write-up, video, gitleaks, BoardingPass rescan, README links, final smoke).

## 2026-07-29

- **VIDEO: NO-GO, called Wed 00:45 — 14 hours ahead of the pre-committed 15:00 gate.** Evidence:
  zero transport code existed (no `videodb` dep, no Recorder, no `NEXT_PUBLIC_ENABLE_VIDEO` in code)
  while the session/debrief PAGES were also still unbuilt and evals were a stub. The substrate
  (TimedWord, TranscriptTurn.mode/videoId/timedWords, joinTimedWords, timeForSpan, debrief
  videoTime — 14 passing timeline tests) ships dormant, so the debrief loses only timestamps,
  exactly as the gate was designed. Timothy's call on recommendation. VideoDB → post-hackathon.
- **Finish-line plan adopted (docs/superpowers/plans/2026-07-29-finish-line-plan.md):** six
  parallel lanes under one-writer-per-file ownership — A ingest wiring + ?mock=1 · B /session ·
  C /debrief + /debrief/[id] · D landing (full 9-section spec) · E evals (P0) · F docs/cleanups.
  Both ROUTE_READY booleans flip in ONE integration commit after live E2E. Latency policy
  pre-committed: levers (reasoning_effort, prompt trim) adopted only if gold precision ≥0.8 /
  recall ≥0.7 hold, else targets restated with measurements. Gold corpus target: 8 pairs,
  Timothy adjudicates Wed evening. Implementation lanes run on Sonnet (Fable orchestrates only)
  to conserve weekly limits — Timothy's ask, Wed 00:50.

- **Debrief meets its latency target — the first one that does.** 22.7s against ≤45s, on a
  2-question session. Live output: 5 covered points, every quote slicing back to the candidate's
  own turn (`turn.text.slice(start,end) === span.text`) and every one attributable to the
  candidate rather than the interviewer; 9 missed points carrying no quotes; the unanswered
  question marked not-attempted without a model call; 0 dropped. Quality note for Thursday: 9
  missed points for one answer is verbose and should probably be capped — not a correctness
  issue, so logged rather than patched mid-build.

## 2026-08-02

- **Light/dark toggle adopted; the 27-Jul theme lock HOLDS and is not superseded.** Vedika's
  `FE-changes` branch (commit `ffd7326`, "FE-Polish") replaced the locked "Reading Room daylight"
  palette outright with a dark navy one. Rather than choose between her work and the lock, both
  ship: `:root` carries the locked daylight tokens unchanged and is what every first-time visitor
  sees; `:root[data-theme="dark"]` carries the navy as **"Reading Room, after hours"**, opt-in via
  a navbar toggle and remembered per browser. Ground `#212959`, surfaces `#262F66`/`#2B3570`,
  hairline `#3D4788`, ink `#EEF1F8`/`#B7BEDE`, primary `#6D8CE8`, status `#E0837F`/`#D9A24F`/`#5FBF94`.
  The two reasons the 27-Jul entry gave for light — differentiation from the uniformly dark AI-tool
  field, and light surviving compressed demo video better — apply to *the default*, which is the
  only thing a judge or a first-time visitor sees. They were never arguments against dark existing.
- **`prefers-color-scheme` deliberately NOT consulted.** Reading the OS would hand the default to
  whatever a visitor's machine happens to be set to, which is precisely the decision the 27-Jul
  entry made on purpose. Light until asked otherwise; the choice then persists.
- **CORRECTION — the 1-Aug `globals.css` header cited a decision-log entry that did not exist.**
  It read "Dark override adopted 1 Aug 2026 (Vedika's call…) — see docs/decision-log.md"; no such
  entry was ever written, and the log's 27-Jul entry recorded the opposite call. On a project whose
  first ground rule is that nothing is displayed without a receipt, a fabricated citation in source
  is the most expensive kind of drift. The comment has been rewritten to describe the two-theme
  contract and to point here. Flagged during review rather than discovered later; recorded so the
  correction itself carries a receipt.
- **`three` + `vanta` accepted CONDITIONALLY, as a dark-only cost** (rule 9 previously sanctioned
  only `videodb` and `@supabase/supabase-js`). Measured: three.js is a **712 KB** client chunk plus
  ~24 KB of Vanta, and the transitive set pulls `@dimforge/rapier3d-compat` (WASM physics),
  `@tweenjs/tween.js` and `fflate`. The condition is that `VantaBackground` renders only when dark
  is active, so the dynamic `import()` never fires on the default path — verified in the browser:
  a light-mode load requests **zero** three/vanta resources, and six chunks appear only after
  switching. A second reason it stays off the default: thin high-contrast moving lines on a flat
  dark field are the worst case for video compression, and Saturday's recording is the deliverable.
- **`localStorage` for the theme preference — a deliberate carve-out from rule 3, not drift.**
  Rule 3 confines in-flight state to `sessionStorage` because a resume must not linger on a shared
  machine (`lib/session-state.tsx` says so in as many words). A theme preference is not document
  content, and a preference that forgets itself when the tab closes is not a preference. Key
  `dryrun-theme-v1`, replayed onto `<html>` by a blocking script before first paint.
- **Anti-flash script verified, and one real bug found doing it.** The key was first imported into
  `layout.tsx` from a `"use client"` module; Next turns client-module exports into client
  references on the server, and the script vanished from the SSR output entirely — the theme was
  silently being applied late by an effect, i.e. the exact flash the script exists to prevent. Key
  and script moved to a plain `app/lib/theme.ts` that both sides can import for real. Evidence
  after the fix: on a dark-stored reload, `data-theme` is already `dark` and the body already
  `rgb(33, 41, 89)` at the **first animation frame**. Pattern confirmed against current Next.js
  docs ("preventing flash before hydration"), not from memory.
- **Six FE defects from the same branch fixed.** `--color-surface-3` was referenced but never
  defined (mobile-menu hover silently did nothing); the active mobile-menu row used a hardcoded
  *light*-theme primary at 8% alpha and was invisible on the dark ground — it now reads as the most
  prominent row; the mobile-menu shadow and `.btn-primary:hover` (which flipped the primary CTA to
  pure white) were hardcoded and are now themed tokens; the hero scrim is tokenised as
  `--scrim-hero` with a near-solid `≤640px` variant, because the desktop gradient cleared by 72%
  and left mobile body copy sitting on bare mesh. A stray root `package-lock.json` — an npm
  artifact in a pnpm workspace — was deleted.
- **Two dark tokens raised on measurement.** `--color-muted` `#8890B8` → `#A8B1D8`: the shipped
  value failed WCAG AA for body text on three of four grounds (4.41 / 4.00 / 3.64 / 3.20 on bg /
  surface / surface-2 / elevated); the replacement clears 4.5:1 on all four (6.52 / 5.92 / 5.39 /
  4.73). `--color-missing` `#E0837F` → `#E99995`: the status trio is set as small uppercase
  code-face text, and missing measured 4.18:1 on `--color-surface-2` — the ground the gap cards
  actually use; it now clears 5.12 there and 5.63 on `--color-surface`. Weak (`#D9A24F`) and
  strong (`#5FBF94`) already passed on both (5.00 / 5.07 and 5.49 / 5.57) and are unchanged.
  `--color-primary` stays `#6D8CE8` at 4.30:1 on the ground — it is a UI/link accent, above the
  3:1 non-text floor, and is not used for body copy.
- **Gap-kind chip tints re-derived from `currentColor`.** The three tint fills were written as
  literals and had drifted apart across the 1-Aug flip: `missing` carried the *dark* palette's
  coral at 10% while `weak` and `strong` still carried the *light* palette's ochre and moss — two
  of three tints wrong in both themes simultaneously. Now
  `color-mix(in srgb, currentColor 10%, transparent)`, so the fill tracks whichever themed token
  the chip's `color` resolves to and cannot drift again.
- **Paper stays the source of truth and keeps the light tokens.** The file's `--color-*` tokens
  (hash `32bb9d6f`) were never changed by the 1-Aug branch and are not changed now. The dark set
  is documented on a new page, "Page 2 — theme modes": the toggle in its four states, plus
  daylight and after-hours tiles built to the same structure so the palettes compare one to one.

### 2026-08-02, later — two amendments from Timothy's review of the merged build

- **The dark-only Vanta gate is REVERSED; the mesh now renders in both themes.** Timothy's call on
  seeing the two grounds side by side: light and dark read as two different sites rather than one
  product. The gate earlier the same day was a cost argument, and the cost is real — three.js is
  now on the default path, so **every** landing visitor pays the 712 KB rather than only those who
  opt into dark. Accepted deliberately, and `AGENTS.md` rule 9 rewritten to say so rather than
  leaving a condition in the docs that the code no longer honours. What survives from the gate is
  the part that mattered for first paint: the import stays dynamic, so the hero renders from CSS
  and the canvas arrives after. The video-compression worry is *lower* in light than it was in
  dark — soft near-white lines on pale paper carry far less edge energy than white on navy.
- **VANTA.NET cannot draw dark lines on a light ground — verified, not assumed.** It blends
  additively, so the line colour can only ever lighten what is behind it. Tested directly by
  setting `color: 0x000000` against the `#EDF1F7` hero: the lines still rendered *lighter* than the
  ground. No colour choice fixes this. The consequence is a real design concession: the light
  hero's Vanta ground is `#D2DCEE`, a deeper cool paper than the locked `#EDF1F7`, because the
  additive lines need something to register against. That deviation is confined to the landing
  hero canvas — `--color-bg` and every app surface keep the locked daylight values, and the hero's
  fade still melts into `#EDF1F7` at the section boundary. Line colour `#F7FAFF`.
- **Both themes now carry a hero scrim.** Light's was `transparent` while the mesh was dark-only;
  it is now the paper ground at 88% across the text column, matching dark's navy wash, with the
  same near-solid `≤640px` variant.
- **Header gained a `--spacing-5` gap.** `justify-content: space-between` sets no minimum, and at
  wide viewports the theme toggle and the account control were nearly touching.

### 2026-08-02, evening — the META sentinel leak (hotfix), and a correction to 31 Jul

- **CORRECTION — the 31 Jul "META protocol byte-identical" claim is falsified.** The sentinel
  *template string* was indeed unchanged, but the same trim (`7e8ec18`) deleted the instruction
  wording that told the model to emit META as **a final line** ("After your reply, output a final
  line, exactly:" became "End replies with exactly:"). The parser's contract was exactly that
  line: `splitReplyAndMeta` stripped META only when it was the last non-empty line. Freed of the
  wording, the model began appending META inline after the prose — and the raw trailer leaked
  into the visible bubble, the committed transcript, `sessionStorage`, the next-turn assistant
  replay (self-reinforcing: the model saw its own leaked turns as precedent), and the debrief's
  quotable text. Vedika hit it repeatedly while recording. "All 20 session tests unmodified" was
  true and is the tell: no test pinned the instruction wording to the parser's expectations, so
  the contract broke without a failure. The 31 Jul entry stays as written; this entry is the
  receipt for what it missed.
- **Fix is four parts, all one root cause** (branch `hotfix/meta-sentinel-leak`): (1)
  `splitReplyAndMeta` hardened — a *verified terminal sentinel* (last `META:` token, incl.
  `**META:**` forms, then one balanced JSON object, then nothing but whitespace/bold/fence to
  end-of-string) strips wherever it sits: inline after prose, own line, pretty-printed, fenced;
  the original line-anchored rule stays as the fail-soft fallback for malformed JSON. Mid-text
  META with prose after its close stays inert — the pinned test holds. (2) The prompt says
  "End replies with a final line of exactly:" again (+4 tokens against the 41% trim), now pinned
  by a `/final line/` test so the next trim fails CI instead of prod. (3) New core
  `streamingReply(buffer)` drives the live bubble: it also *withholds partial sentinels*
  (`META: {"ac`) mid-delta, so wire protocol never flashes; the trailing `meta` frame reconciles
  at stream end. (4) `buildInterviewerMessages` sanitizes replayed *interviewer* turns through
  the parser, so contaminated stored sessions stop teaching the model to leak; candidate turns
  are never rewritten — the debrief quotes them verbatim and replay must match.
- **Accepted residual:** turns already committed with a leaked trailer before the fix still
  display in those old sessions' transcript UIs and can be quoted by their debriefs. Replay is
  sanitized; stored history is not rewritten — a `sessionStorage` migration is out of hotfix
  scope, and re-recording starts a fresh session anyway.

### 2026-08-02, night — the review that caught the hotfix half-done

- **CORRECTION — PR #22 fixed the leak we SAW, not the leak we HAD.** A four-lane inline review
  plus a workflow review of the merged diff found nine further shapes where the same wire
  protocol still reached the candidate, each verified by executing the committed code. The worst
  were mundane: a **sentence-final period** after the sentinel (`META: {"action":"advance"}.`)
  reclassified it as prose and leaked the whole thing; a **backticked payload** did the same and
  streamed raw JSON live with no withholding; a **truncated payload** (`finish_reason=length`)
  leaked at stream end *after* the live bubble had correctly hidden it. Two were regressions PR
  #22 introduced: broadening the line rule to bolded tokens **deleted legitimate prose lines**
  opening with `**META:**`, and a sentinel emitted *before* the prose made that rule **eat the
  interviewer's question**, committing an empty bubble while the composer waited for an answer to
  something never shown. The lesson generalises past this bug: the first fix encoded the one
  example in the screenshot as if it were the rule.
- **Root cause of the root cause: the parser had no stated principle, only a pattern.** The
  rewrite adopts one — **the sentinel is TERMINAL**; once its payload closes, anything left is
  wrapper noise, and only letters or digits after the close mean the model was talking *about*
  META. That single idea subsumes the period, the backticks, the fences, the bolding, and the
  emoji nobody has sent yet. Three subordinate rules follow: a payload fragment carrying a quote
  is truncated JSON (cut it), an anchored token with **no** payload is prose (keep it), and an
  anchored sentinel with prose after it is misplaced rather than quoted (excise the sentinel,
  keep the words). 58 session tests, every shape above pinned.
- **A denial-of-service the leak-hunt turned up on the way.** `parseJsonAt`'s shortest-prefix
  scan was unbounded, and `buildInterviewerMessages` replays **client-supplied** transcript text
  through it — so an unauthenticated POST carrying `META: {"a":"` plus a megabyte of `}` pinned
  the function until `maxDuration`. Measured 2.2ms → 12.3ms → 107ms at 1k/4k/16k braces (clean
  quadratic), 12.7s at 200k. Payload scanning is now capped at 512 chars, which is ~20× any real
  sentinel. The in-code comment excusing the quadratic ("payloads are a dozen tokens") was
  written for model output and never revisited when the same function started parsing user input.
- **Known and NOT fixed (logged, not hidden):** a line-anchored token still freezes the streaming
  bubble until the turn ends, so an interviewer who explains the protocol mid-reply reads as
  stalled and the text arrives in one late block. No protocol leaks and the final text is
  correct; the docstring now says so plainly instead of claiming withholding is always transient.
  Deferred deliberately with the submission hours away — the safe direction is a late reveal.

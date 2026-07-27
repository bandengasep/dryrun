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

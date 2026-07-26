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

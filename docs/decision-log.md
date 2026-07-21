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

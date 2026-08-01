# DryRun — rehearse the interview you're about to have

> Paste a job description and a resume; DryRun diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles **your interview**: the questions you'll actually face, rehearsed live against an AI interviewer, debriefed with feedback that quotes your own words back to you. Nothing displayed without a receipt; nothing graded, everything cited.

**Pivoted 26 Jul** (was: executable-SQL-challenge compiler — see `docs/decision-log.md` 2026-07-26 and the full plan in `docs/superpowers/plans/2026-07-26-pivot-interview-rehearsal.md`; product spec: `docs/spec-pivot-2026-07-26.md`; the old `docs/spec.md` is historical).

**Deadline: EXTENDED to Sun 2 Aug 2026** (announced 30 Jul; submit Sat evening for buffer). Submission = public repo + ≤3-min video + ≤1,000-word write-up **using the five pillars as section headings**.
**Rubric** (1–5 each): Problem (success criteria defined *before* building) · Approach (every decision reasoned, alternatives named) · Evidence (every claim backed by measurement/comparison/demonstration) · Constraints (cost, latency, reliability, safety) · Honesty & Trajectory (failure modes, limitations, next steps). Master rule: *a modest claim, proven, beats a grand claim, asserted.* Judges finally answer: would they interview the applicant. Prizes incl. **"Best Use of Agnes AI" ($500)**.

**Ownership (from 26 Jul):** Claude sessions — Paper design + ALL code (core + web). Timothy — keys/redemptions, eval-corpus export + gold adjudication, go/no-go calls, submission. Vedika — landing/about copy, storyboard, 3-min video, write-up polish.

---

## Ground rules (every session)

1. **Receipts everywhere — unchanged law, now three links deep.** Gap → JD span + resume span. Interview question → `gapId`. Debrief claim → verbatim transcript quote (`locateSpan`-validated; + video timestamp when the answer was recorded). A feature that can't carry receipts doesn't ship; a quote that fails mechanical validation is demoted to a visible `dropped[]`, never displayed, never silently discarded.
2. **No scores, no grades — a stance, not a gap.** The debrief says what an answer covered and missed, quoting the candidate. It never emits numbers, letter grades, or pass/fail. (Extends the old no-readiness-score rule; unprovable claims lose judges.)
3. **Client-held session state in flight; storage only on explicit "Save & share."** Serverless routes are stateless: the client re-sends `{plan, transcript}` each request; in-flight persistence is sessionStorage only (`dryrun-session-v1`). The ONE server-side write is the explicit **Save & share debrief** button (`sessions` table via `@supabase/supabase-js`, `SUPABASE_SECRET_KEY` server-side only → shareable read-only `/debrief/[id]`; "anyone with the link can view" stated on the button). No ambient storage, no accounts, no RLS complexity, no pgvector. (Timothy's 26-Jul-eve call over the no-DB recommendation — scoped to write-once shareable debriefs.)
4. **Providers: OpenAI + Agnes AI, through the client-injection seam** (`new OpenAI({ baseURL, apiKey })` handed to core). Compile/plan/debrief run `gpt-5.6-luna` (adopted 31 Jul through the mechanical gates, env-flagged `OPENAI_STRUCTURED_MODEL`; unset falls back to core's `gpt-5-mini` default — see decision-log 2026-07-31); the interviewer lane defaults to Agnes (`AGNES_BASE_URL`, default model `agnes-2.0-flash`) with per-request failover to OpenAI, honestly labeled in the UI. **No Vercel AI SDK. Never the Realtime speech-to-speech API** (credit trap).
5. **Verify APIs before coding, don't trust memory.** ⚠ Open verification items: Agnes `/responses` support (else `chat.completions` + `response_format: json_schema`), VideoDB Node SDK upload-URL + timed-transcript methods. Use context7 / vendor docs; record findings in the decision log.
6. **Cut list (do not build before 1 Aug):** SQL challenge *generator* (the harness stays in-repo, dormant and CI-green — it is Trajectory material), pgvector (Supabase itself is allowed ONLY for the Save-&-share table in rule 3), LinkedIn anywhere in runtime (verified infeasible serverless + ToS risk), GMI Cloud lane (no key), readiness/aggregate scores, resume rewriting, answer auto-scoring, accounts/auth beyond the cosmetic mock. New ideas → `docs/post-hackathon-ideas.md`, unevaluated.
7. **Branch discipline.** Work on `timothy`; PR to `main` at least daily; `main` stays demoable; `protect-main` requires PR + green `verify` check.
8. **Secrets:** real values only in `.env` (gitignored) and its copy `web/.env.local`. `.env.example` stays placeholder-only. Env names: `OPENAI_API_KEY`, `AGNES_API_KEY`, `VIDEODB_API_KEY` (+ optional `INTERVIEWER_PROVIDER`, `AGNES_BASE_URL`, `AGNES_MODEL`, `NEXT_PUBLIC_ENABLE_VIDEO`). Never echo key values; verify placement via `git status` + length checks.
9. **Dependencies:** the sanctioned new dependencies are `videodb`, `@supabase/supabase-js`, `three`, `vanta` and `@types/three` (all web/ only; core stays free of them). three/vanta cost **712 KB** on the landing page in both themes — accepted 2 Aug for visual consistency between the two grounds (decision-log 2026-08-02, which supersedes that morning's dark-only gate). The one hard requirement that remains: the import stays **dynamic**, so the mesh never blocks first paint — the hero renders from CSS and the canvas arrives after. Mind pnpm 11 gates (`allowBuilds`, `minimumReleaseAge` excludes) and commit the lockfile (CI is `--frozen-lockfile`). Anything else: ask first.

## Stack

- **Monorepo:** pnpm workspace, Node 22, TS 5.x. `packages/core` = framework-agnostic library (schemas/parsers/diff/plan/session/debrief/evals; harness dormant); `web/` = Next 16 App Router + React 19, CSS Modules (no Tailwind), tokens in `globals.css`. **Theme — default locked 27 Jul, optional dark added 2 Aug.** `:root` = **"Reading Room daylight"** (unchanged, and what every first-time visitor sees): cool paper ground `#F5F7FB` (landing hero: gradient `#EDF1F7→#FFFFFF`), white surfaces, hairlines `#DEE4ED`, ink text `#1D2127`, **ink-blue primary `#2E4C8F`**, status coral/ochre/moss `#C05353·#A87E2F·#3E7D63`. `:root[data-theme="dark"]` = **"Reading Room, after hours"**, opt-in via the navbar toggle and remembered in `localStorage` (`dryrun-theme-v1`, replayed pre-paint by a blocking script in `layout.tsx`): ground `#212959`, surfaces `#262F66·#2B3570`, hairline `#3D4788`, ink `#EEF1F8·#B7BEDE`, muted `#A8B1D8`, primary `#6D8CE8`, status `#E99995·#D9A24F·#5FBF94`. `prefers-color-scheme` is deliberately not consulted. Only colour-bearing tokens are themed; type/spacing/radii live once in `:root`. The landing hero carries an animated Vanta mesh in **both** themes; because VANTA.NET blends additively (it can only lighten), the light hero's canvas ground is a deeper `#D2DCEE` with `#F7FAFF` lines — a concession confined to that canvas, not to `--color-bg` or any app surface. Type = **Fraunces** (display) + **Instrument Sans** (UI) + Google Sans Code (evidence voice). Source of truth: Paper file "Dryrun-WebApp" — Page 1 tokens + theme tile (light), Page 2 "theme modes" (toggle states + both palettes).
- **LLM calls:** OpenAI Node SDK `openai@^6` — strict structured outputs via `responses.parse` + `zodTextFormat` for compile/plan/debrief; plain `chat.completions` **streaming** for the interviewer turn (the OpenAI-compatible lowest common denominator, so it runs on Agnes). Embeddings `text-embedding-3-small`.
- **Streaming:** SSE (`text/event-stream`) for `/api/compile` (stage events) and `/api/session/turn` (token deltas + trailing `META` action); shared framing in `web/app/lib/stream.ts`; heartbeat comments every 10s; per-route `export const maxDuration`.
- **Video answers (gated):** browser `MediaRecorder` → **direct upload to VideoDB via server-minted upload URL** (never proxied — ~4.5MB body cap) → `indexSpokenWords` → timed transcript; `turn.text` built only by `joinTimedWords` so char-offset → timestamp is exact arithmetic. Feature-flagged `NEXT_PUBLIC_ENABLE_VIDEO`; **go/no-go Wed 29 Jul 15:00** — on no-go the session ships text-only and the debrief loses nothing but timestamps.

### Provider matrix (which AI does what)

| Call | Provider · model | Why |
|---|---|---|
| JD/resume parse · gap adjudication · plan compile · debrief compile | OpenAI · `gpt-5.6-luna` (strict SO; `OPENAI_STRUCTURED_MODEL`, unset → `gpt-5-mini`) | receipts-critical → gate-verified 31 Jul, 4–6× faster |
| Embeddings | OpenAI · `text-embedding-3-small` | shipped |
| **Interviewer turns** | **Agnes · `agnes-2.0-flash`** streaming; OpenAI failover (labeled) | prize lane; conversational, no strict SO needed |
| Plan compile (evals only) | also run on Agnes | the OpenAI-vs-Agnes comparison exhibit |
| Video → timed transcript | **VideoDB** `indexSpokenWords` | timestamps for debrief receipts |
| Save & share debrief | **Supabase** (`sessions` table, server-side secret key) | explicit write-once shareable link |
| Zero-shot baseline | OpenAI · `gpt-5-mini` plain chat | the comparison target |

Principle: receipts-critical structured calls stay on the proven OpenAI strict-SO path; the conversational lane goes to Agnes; VideoDB owns perception; Supabase stores only what the user explicitly saves.

## Layout

```
packages/core/src/{schemas,parsers,diff,plan,session,debrief,evals}/   # library (harness/ dormant)
packages/core/test/            # vitest; fixtures/ jd|resume-01..05 + gold/ (sheets + taxonomy validator)
packages/core/test/evals/      # keyed eval runner (RUN_EVALS=1), results → evals/results/*.json
web/app/{compile,plan,session,debrief}/    # the four surfaces (results/ + compiler/ deleted 26 Jul)
web/app/api/{compile,plan,debrief,extract-image,session/turn,session/save}/route.ts
web/app/lib/{stream,sse-response,providers,session-state,sessions,extract,receipts,routes,theme,mock,langfuse,langfuse-otel,langfuse-mask}.ts(x)
docs/                          # spec-pivot-2026-07-26.md, decision-log.md, post-hackathon-ideas.md
```

## Build order (from 27 Jul)

0. **Commit 0 — this docs pass.** ✅
1. **Plan compiler:** schemas (`SessionPlan`, `InterviewQuestion`, `StarHints`) + `src/plan` with grounding guards (unknown `gapId` → throw; behavioral without STAR → throw; conceptual with STAR → coerce null) + `/api/plan` + `/api/compile` SSE rewrite. Offline guard tests ship with it.
2. **Session:** `src/session` (`buildInterviewerMessages`, `splitReplyAndMeta` — client is the state machine, follow-ups capped at 2) + `/api/session/turn` (Agnes lane, OpenAI failover) + Agnes live smoke. Preview deploy: **verify SSE on real Vercel, not localhost**.
3. **Debrief:** `TranscriptTurn`/`DebriefReport` schemas + `src/debrief` (batched call → `locateSpan` validation → demote failures to `dropped[]`) + `timeline.ts` (pure span→timestamp mechanics) + `/api/debrief`.
4. **Video rung (gated):** `Recorder` component + `/api/video/upload-url` + `/api/video/transcript`.
5. **Evals (Thursday-protected):** mechanical metrics in `src/evals` (grounding, citation stats, Jaccard, cost, uncitedRate) + keyed runner + corpus runs + OpenAI-vs-Agnes comparison + zero-shot baseline → `evals/results/` + README table.

FE lane in parallel: Paper design is DONE (27 Jul, Reading Room daylight theme — tokens + 4 artboards + theme tile in "Dryrun-WebApp"; Page 2 "theme modes" added 2 Aug for the toggle + dark palette); build pages from the artboards via `get_jsx`/`get_computed_styles`. Landing layout additionally references the remixed Framer "Message" template (measured spec; Vercel-only — Framer never hosts). Day one chores need no design: state bridge, deletions (`/results`, `/compiler/[lang]`, `landing.tsx` — the readiness bar and fake Run die there), Navbar tabs, `/compile` SSE trace, false "on-device" copy removal.

## Success criteria (locked before building — see `docs/spec-pivot-2026-07-26.md`)

Displayed-question grounding 100% by construction (pre-guard ≥95%) · displayed debrief quotes 100% mechanically valid (dropped <10%) · Jaccard ≥0.6 over 20 runs · gold precision ≥0.8 / recall ≥0.7 · compile ≤$0.05, session ≤$0.25 median · compile p50 ≤60s, plan ≤20s, first turn token ≤3s, debrief ≤45s · quote→timestamp exact ≥90% · baseline uncited-rate reported side-by-side.

## Vedika handoff points

- **Schema freeze:** `SessionPlan` / `TranscriptTurn` / `DebriefReport` freeze after Tue 28 Jul (same regime as `Gap`, frozen 21 Jul): breaking changes need a decision-log entry + a ping.
- Copy passes (landing/about, honest claims only), storyboard Wed, first takes Thu, final 3-min cut Fri (suggested arc: open on Timothy's real Venture-JD compile, close on baseline-vs-ours numbers).

## Final-week checklist (Thu 30 – Fri 31)

BoardingPass + app-store rescan for newly shipped interview-prep features (narrow the pitch to receipts + mechanical citation validation if crowded) · `gitleaks detect` over full history · CI badge green · eval table in README · video link + write-up in README · submit by 20:00 Fri.

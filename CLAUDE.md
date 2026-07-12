# DryRun — the interview compiler

> Paste a job description and a resume; DryRun diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles a personalized interview environment: executable SQL challenges and behavioral questions, each traceable to the gap that produced it.

**Deadline: 31 Jul 2026, 23:59 SGT.** Submission = public repo + ≤3-min video + ≤1,000-word write-up.
**Judged on five pillars** (Problem, Approach, Evidence, Constraints, Honesty & Trajectory), 1–5 each. Master rule: *a modest claim, proven, beats a grand claim, asserted.* Not polish.
**Team:** Timothy (backend / agents / evals) · Vedika (UI/UX / video).
Full product spec lives in `docs/spec.md` (copy of interview-compiler-spec.md). This file is operational.

---

## Phase 0 — Repo bootstrap (run first; delete this section when done)

⚠️ This machine's global git config belongs to Timothy's ComChord (work) identity. This repo must live entirely on his **personal** GitHub account, reached via the SSH host alias **`github.com-personal`** (key `id_ed25519_personal`; the work alias is `github.com-comchord`). Never touch `--global` config. (Note: `gh-personal`/`gh-work` are zsh aliases for `gh auth switch --user …` — they toggle the `gh` CLI's authenticated account over HTTPS/token and are **not** SSH host aliases. Being shell aliases, they also don't exist in non-interactive shells.)

**1. Local identity only**
```bash
git init -b main
git config user.name "Timothy Hartanto"
git config user.email "timothyhartanto@yahoo.com"
```

**2. Verify the personal SSH alias and detect the username**
```bash
grep -iA4 "host github.com-personal" ~/.ssh/config
ssh -T git@github.com-personal
```
Expected: `Hi <personal-username>! You've successfully authenticated…` — the greeting is the success signal (GitHub exits 1 by design). Use that `<personal-username>` everywhere below. If the alias is missing from `~/.ssh/config`, stop and ask Timothy before improvising.

**3. Create the repo — public from day 1**
Run `gh auth status` first. If the active `gh` account is the work one, do **not** use `gh repo create` — create `dryrun` (**public**, empty: no README/.gitignore) via github.com in the personal account's browser session, or run `gh auth switch` to the personal account if it's logged in. Then:
```bash
git remote add origin git@github.com-personal:<personal-username>/dryrun.git
git push -u origin main

# per-person work branches off main — all day-to-day work happens on these
git branch timothy && git branch vedika
git push -u origin timothy vedika
git switch timothy    # Timothy codes on this branch from now on
```
Public from day 1 (Timothy's call, 12 Jul): the submission requires it anyway, and the live commit history is Honesty & Trajectory material. Two consequences: (a) secret hygiene is non-negotiable — before the first push, verify repo Settings → Code security shows secret scanning **and push protection** enabled; (b) branch protection is free on public repos — Settings → Rules → Rulesets → **New branch ruleset**: name `protect-main`, Enforcement status **Active** (default is Disabled — don't skip this), bypass list empty, target = Include default branch. Tick **Require a pull request before merging** (required approvals: 0); keep the pre-ticked Restrict deletions + Block force pushes; leave Require linear history off (squash-only merging fights long-lived personal branches). Do **not** tick Require status checks yet — GitHub refuses to save that rule with an empty check list. After CI's first run, edit the ruleset, tick **Require status checks to pass** → Add checks → select the CI job by name; leave "Require branches to be up to date" off. One sequencing catch: an Active `protect-main` blocks direct pushes to `main`, and Phase 0's initial push is exactly that — set its enforcement to Disabled just before the first push, then flip it back to Active immediately after.

**4. Commit-email gotcha (do this once, on github.com)**
On the personal account: Settings → Emails → confirm `timothyhartanto@yahoo.com` is added **and verified**. If "Block command line pushes that expose my email" is enabled, pushes with that address get rejected (GH007) — either untick it or set the local `user.email` to the account's `@users.noreply.github.com` address instead.

**5. Invite Vedika**
Repo → Settings → Collaborators → Add people → invite by email: **`vedikavin00@gmail.com`**. Her clone-side setup (send her this):
```bash
git config user.name "Vedika"
git config user.email "vedikavin00@gmail.com"
git switch vedika    # her work branch; lands on main via PR only
```

**6. Scaffold + hygiene**
- Layout below; seed `docs/decision-log.md` with the three 12-Jul entries from the spec, plus today's three: name = DryRun; per-person branch model (`timothy`/`vedika` → PR → `main`); repo public from day 1. Create empty `docs/post-hackathon-ideas.md`.
- `.gitignore`: Python + Node templates, plus `.env`. Ship `.env.example` with `OPENAI_API_KEY=`, `SUPABASE_URL=`, `SUPABASE_SERVICE_ROLE_KEY=`. Secrets never enter git.
- `.github/workflows/ci.yml`: run `uv sync` + `pytest` in `api/` on every push/PR. README gets the CI badge from day 1 — a green badge history is Evidence-pillar material.

**Phase 0 done when:** repo pushed on the personal account with `timothy` and `vedika` branches tracking origin, Vedika invited, CI green on one trivial test, push protection verified and the `main` ruleset in place, layout scaffolded, decision log seeded, this section deleted (log its completion in the decision log).

---

## Ground rules (every session)

1. **The cut list is law.** Never build: readiness/aggregate scores, resume rewriting or bullet tailoring, persistent evidence-bank UI, ATS match scores, application tracker, company/competency prediction, answer auto-scoring, graph DBs (NetworkX/Neo4j), Redis, Realtime speech-to-speech. New ideas go to `docs/post-hackathon-ideas.md`, unevaluated, no exceptions until 31 Jul.
2. **Receipts everywhere.** Every gap, question, and claim carries its source spans (JD line ↔ resume line ↔ gap ID). A feature that can't carry receipts doesn't ship.
3. **Execution is ground truth.** A compiled challenge ships only if its own tests pass; CI enforces this.
4. **Runtime = OpenAI only** ($150 hackathon credits). Claude Code is the dev tool; never put Anthropic APIs in the product runtime.
5. **Verify APIs before coding, don't trust memory.** Pull current docs via Context7: `/openai/openai-python` (structured outputs / `responses.parse`), `/supabase/supabase`, `/vercel/next.js`.
6. Ask before adding any dependency not in the stack lock. Log real architecture/scope decisions in `docs/decision-log.md` with date + one-line rationale.
7. **Branch discipline.** Day-to-day work lives on `timothy` and `vedika`; nothing lands on `main` except via PR with CI green. Merge to `main` at least daily once real commits exist — `main` must always be demoable. Lanes barely overlap (`api/` vs `web/`), so merges stay cheap; don't let the branches drift for days. (The repo is public, so this is enforced by the `main` ruleset from Phase 0 step 3, not just convention.)

## Stack (locked 12 Jul — mobile formally retired; web app)

- **web/** Next.js + React (Vedika) — challenge execution and code editing are desktop-native.
- **api/** FastAPI, Python 3.12, managed with `uv`.
- **Data:** Supabase Postgres + pgvector.
- **Models:** `gpt-5-mini` (fallback `gpt-4.1-mini`) with **strict structured outputs**; embeddings `text-embedding-3-small`; prompt caching on repeated JD context. Budget: full eval suite ≪ $150.
- **Challenge sandbox:** DuckDB/SQLite + pytest.

## Layout

```
api/app/{schemas,parsers,diff,harness,evals}/
api/tests/            # incl. tests/fixtures/ (hand-built JD×resume pairs)
web/                  # Vedika's Next.js app: compile-trace UI, receipts drawer
docs/                 # spec.md, decision-log.md, post-hackathon-ideas.md
.github/workflows/ci.yml
```

## Build order — Timothy's lane

- **Commit 1 — Schemas + strict SO calls.** Pydantic models for JD requirement lines and resume lines, one schema family, every line carrying a source span (char offsets). Parser calls via the Responses API structured-output path (`client.responses.parse(..., text_format=Model)` — confirm current signature via Context7 before writing). One sample JD + one resume as fixtures.
- **Commit 2 — Diff + receipts, green on 3 hand-built fixtures.** Embedding match (in-memory cosine is fine at fixture scale; pgvector wiring comes right after) + LLM adjudication → typed set-difference: *missing / weak evidence / strong differentiator*, every row with JD-span + resume-span receipts. pytest green on all 3 pairs.
- **Commit 3 — Sandboxed SQL harness.** Given a challenge spec (schema, seed data, reference solution, tests), execute in DuckDB/SQLite; reject any challenge whose own tests fail. Wire into CI as the executability job.
- **Then:** pgvector persistence → Challenge Compiler (SQL-first) → Behavioral Compiler (STAR scaffolds, cites weak-evidence rows, no scoring) → **Eval Suite**: gap-detection precision on 15–20 hand-adjudicated pairs, citation-validity rate, 100% challenge executability (CI), run-to-run Jaccard consistency over 20 runs, cost + latency per compile, and the zero-shot ChatGPT baseline (its hallucinated-gap and uncited-claim rate vs ours). The eval numbers are the Evidence pillar — treat them as a feature, not an afterthought.

## Vedika handoff points

- Compile-trace UI + receipts drawer consume the diff engine's typed JSON. Schema freezes at commit 2; breaking changes require a decision-log entry and a ping to her.
- Mock-mode flow and the 3-min video storyboard are hers; neither blocks the MVP demo path.

## P1 fence (only after the MVP demo path is green end-to-end)

Context paste (true-gap vs presentation-gap reclassification, receipts required) · text mock mode (no scoring claims) · voice mock turn (Whisper STT + `gpt-4o-mini-tts` — never the Realtime API; it burns the credits).

## Final-week checklist (29–30 Jul)

Re-scan BoardingPass + app stores for newly shipped interview-prep features; if found, narrow the pitch to the receipts + execution-verified mechanism. Run `gitleaks detect` over the full history as final insurance; confirm CI badge, video link, and write-up in README.

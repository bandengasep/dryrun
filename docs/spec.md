# Interview Compiler — Locked Spec & Brainstorm Close-Out
**12 Jul 2026 · 19 days to submission (31 Jul, 23:59) · Team: Timothy (backend/agents/evals) + Vedika (UI/UX, video)**

## One-liner
Paste a job description and your resume; Interview Compiler diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles a personalized interview environment: executable SQL/coding challenges and behavioral questions, each traceable to the gap that produced it.

**Demo opening line (Timothy, on camera):** "I'm a fresh MSBA grad mid-job-hunt. Every interview, I re-derive my prep from scratch — and generic question banks don't know *my* gaps."

## Positioning vs the venue (BoardingPass)
Their flight plan: build portfolio → tailor applications from real evidence → discover jobs → stay organised. Their pipeline tracks an **Interview · Online Assessment** stage — with no tooling behind it. **We compile the prep for the stage they only track.** *BoardingPass flies you to the interview; Interview Compiler is the flight simulator.* Their proof-oriented Experience Engine ethos ("evidence that travels") is our ethos too — we complement the venue, we don't clone it.

| BoardingPass (live, 12 Jul 2026) | Our stance | Why |
|---|---|---|
| Portfolio builder (projects, experiences, skills, artifacts) | **Avoid** | No persistent evidence-store UI; P1 accepts pasted context only |
| "Tailor from real evidence" → resumes, bullets, grounded applications | **Non-goal, explicit** | This is TailorTrack — the host owns it; we never rewrite resumes |
| Job discovery + role-fit signals | **Avoid** | One JD in, no catalog |
| Application tracker (statuses, versions, deadlines) | **Avoid** | Their Job Search Snapshot widget |
| Profile Readiness % | **Avoid** | No aggregate scores anywhere; per-gap receipts instead |
| Interview · OA stage (tracked, untooled) | **Our wedge** | The unserved stage — cite their own dashboard as Problem evidence |

## MVP features (locked)
1. **JD Parser** — strict structured outputs → typed requirement lines with source spans.
2. **Resume Parser** — same schema family; PDF/image path via vision. (Agnes agnes-2.0-flash as documented vision fallback → side-prize slot, not runtime dependency.)
3. **Gap Diff Engine** — pgvector embedding match (JD requirement ↔ nearest resume lines) + LLM adjudication → typed set-difference. Outputs: *missing skills / weak evidence / strong differentiators*. Every row carries receipts.
4. **Compile-Trace UI** — Vedika's receipts-drawer pattern: gap → JD line + resume line; question → gap ID. The audit trail *is* the interface.
5. **Challenge Compiler (SQL-first)** — schema + seed data + reference solution + test harness (DuckDB/SQLite + pytest); a challenge ships only if its own tests pass. CI badge in repo. *Execution is the ground truth.*
6. **Behavioral Compiler** — questions citing weak-evidence rows, STAR scaffold per question. No answer scoring (subjective — see cuts).
7. **Eval Suite** — gap-detection precision on 15–20 hand-adjudicated JD×resume pairs (own + classmates' resumes); citation-validity rate; 100% challenge executability (CI-enforced); run-to-run gap-set consistency (Jaccard over 20 runs); cost + latency per compile. **Baseline: zero-shot ChatGPT on identical inputs — measure its hallucinated-gap and uncited-claim rate vs ours.**

## P1 (only after MVP demo path is green)
- **Context paste** — optional extra experience text at compile time → reclassifies gaps as *true gap* vs *presentation gap* (evidence exists, resume is silent). Retrieval-grounded, receipts required.
- **Mock mode (text)** — compiled questions in interview flow, answers captured, zero scoring claims.
- **Voice mock turn** — Whisper STT + gpt-4o-mini-tts pipeline. Never the Realtime API (credit trap).

## Cut list (= Approach-pillar rule-outs, keep in write-up)
Readiness/aggregate scoring (unverifiable + venue collision) · resume rewriting/bullet tailoring (host's step 2) · persistent evidence-bank UI (host's step 1) · ATS match score (proxy metric) · application tracker (host's step 4) · "hidden competencies"/company prediction (built on invented data) · whiteboard/communication scoring (unverifiable) · answer auto-scoring (subjective ground truth) · NetworkX/Neo4j graph (no measured benefit over typed sets — complexity without justification) · Redis (Supabase suffices) · Realtime speech-to-speech (burns the $150).

## Stack lock
Web app (Next.js/React — challenge execution and code editing are desktop-native; mobile formally retired). FastAPI · Supabase + pgvector · OpenAI runtime: GPT-5-mini / 4.1-mini with strict structured outputs, text-embedding-3-small, prompt caching on repeated JD context. Budget: text + embeddings ≈ pennies per compile; full eval suite ≪ $150.

## Decision log
- **12 Jul** — Interview Compiler selected on founder-fit/ownership; Legible + MediRead retired to post-hackathon file.
- **12 Jul** — TailorTrack research correction: BoardingPass homepage now ships "portfolio + tailor from real evidence" — the store-plus-retrieval combo my earlier research called unclaimed. Evidence Bank demoted to P1 context-paste; resume tailoring made an explicit non-goal.
- **12 Jul** — Positioning locked: serve the Interview·OA stage BoardingPass tracks but doesn't tool.

## Handoff to build
- **Timothy:** schemas → diff engine → harness → evals. First three commits: (1) JD/resume Pydantic schemas + strict-SO calls, (2) diff + receipts passing on 3 hand-built fixtures, (3) sandboxed SQL harness executor.
- **Vedika:** compile-trace UI + receipts drawer, mock-mode flow, 3-min video storyboard (open on Timothy's line; close on the ChatGPT-baseline numbers).
- **Final-week recheck (29–30 Jul):** re-scan BoardingPass + app stores for newly shipped interview-prep features; if found, narrow the pitch to the receipts + execution-verified mechanism.
- **Pact:** every new idea until 31 Jul goes to `docs/post-hackathon-ideas.md`, unevaluated.

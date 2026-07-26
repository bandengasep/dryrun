# DryRun — pivot spec (locked 26 Jul 2026)

> **Rehearse the interview you're about to have.** Paste a JD and your resume; DryRun diffs them into evidenced gaps, compiles the interview those gaps predict, runs it against you live, and debriefs you with feedback that quotes your own answers. Nothing displayed without a receipt; nothing graded, everything cited.

Supersedes `docs/spec.md` (12-Jul close-out, kept as history) for product surface. The engine underneath — parsers with verbatim-quote receipts, gap diff with citation guards — is unchanged. Execution plan: `docs/superpowers/plans/2026-07-26-pivot-interview-rehearsal.md`.

## The problem (Problem pillar)

Candidates walk into interviews prepared for *a* job, not *their* job: generic question banks ignore what this JD demands and what this resume is silent on. LLM chatbots will happily invent both the questions and the praise — unanchored to any line of either document. And interviews themselves are increasingly run by AI screeners, which makes rehearsal-against-an-AI the realistic practice condition, not a gimmick. Existing approaches fall short on the same axis: no provenance. DryRun's bet: **prep you can audit** — every question traceable to a measured gap, every piece of feedback traceable to words you actually said.

## The four stages

1. **Compile** — JD + resume → atomic requirement/evidence lines with char-exact span receipts (`sourceText.slice(start,end) === text`, enforced); unlocatable quotes surface in `dropped[]`. Gap diff classifies every requirement *missing / weak evidence / strong differentiator* with JD+resume citations; fabricated citations are rejected structurally. Live SSE trace while it runs.
2. **Session Plan** — one batched call compiles ≤6 interview questions from the gaps: `missing_skill` → conceptual, `weak_evidence` → behavioral with STAR scaffold hints, ≤1 differentiator flex. Every question carries a `gapId` receipt; a question citing a nonexistent gap is rejected (guard, not vibes).
3. **Session** — an AI interviewer (Agnes AI lane, OpenAI failover — labeled) asks the plan's questions with adaptive follow-ups (capped at 2), streaming. Answers by text, or **recorded video** (VideoDB: direct upload → timed transcript; feature-gated, go/no-go Wed 15:00).
4. **Debrief** — per question: what the answer covered and missed. Every "covered" claim anchors to a verbatim transcript quote, mechanically re-located with the same span locator the parsers use — video answers get exact timestamps (computed arithmetically from timed words, never model-emitted). Claims whose quotes fail validation are demoted to a visible dropped-count footer. **No scores anywhere.**

## Success criteria (defined before building — measured Thu 30 Jul)

| Metric | Target | Method |
|---|---|---|
| Displayed-question grounding | 100% by construction; pre-guard model rate ≥95% | mechanical |
| Displayed debrief quotes valid | 100% by construction; dropped-rate <10% | mechanical (`locateSpan`) |
| Gap-set consistency (20 runs/pair) | mean pairwise Jaccard ≥0.6 | mechanical |
| Gap precision / recall vs gold (13 pairs) | ≥0.8 / ≥0.7 | human-adjudicated |
| Cost | compile ≤$0.05 · full session ≤$0.25 median | usage capture |
| Latency | compile p50 ≤60s · plan ≤20s · first turn token ≤3s · debrief ≤45s | measured |
| Video quote→timestamp exact mapping | ≥90% (expected ~100% by construction) | mechanical |
| Zero-shot ChatGPT baseline | its uncited/hallucinated-content rate reported side-by-side | mechanical (`uncitedRate`) |

Provider comparison (OpenAI vs Agnes on plan compile: grounding, guard rejections, STAR completeness, cost, latency) reported as the Constraints/Approach exhibit.

## Non-goals (this week)

No scores/grades/readiness numbers · no SQL drill generation (harness stays dormant+green; parked) · no accounts and no *ambient* server-side storage — in-flight state is client-held; the single exception is the explicit **Save & share debrief** button (write-once `sessions` row → read-only shareable link, "anyone with the link can view" stated at the point of save) · no LinkedIn/job-board integration in runtime · no Realtime speech-to-speech · no resume rewriting.

## Known failure modes (Honesty pillar — say them out loud)

Very vague JDs yield broad gaps → broader questions (measured by grounding + gold metrics, shown, not hidden) · interviewer quality varies by provider (failover labeled, compared in evals) · debrief can under-cite (dropped-count is visible by design) · video rung is integration-risky (hard gate + text fallback that loses only timestamps).

# DryRun — video storyboard (≤3:00 cut)

For Vedika. Record Saturday against **prod** (dryrun-web-pi.vercel.app), after Saturday's re-freeze and final smoke. Timothy drives the screen; you own framing, pacing, and the edit. The arc is pre-committed: open on the real Venture-JD compile, close on baseline-vs-ours numbers. **No LinkedIn comparison beat anywhere.**

## Shot table (11 shots, 3:00 total)

| t (mm:ss) | screen / action | voiceover beat | pillar served |
|---|---|---|---|
| 00:00–00:12 (12s) | Landing hero, slow scroll to the tagline | "Interview prep is generic. The interview you're about to have is specific. DryRun compiles *your* interview — from the job description and your resume." | Problem |
| 00:12–00:20 (8s) | `/compile`: Timothy pastes the real Venture JD, then his real resume | "This is a real JD I'm applying to, and my real resume. No demo data." | Problem / Evidence |
| 00:20–00:42 (22s) | Compile runs — SSE stage trace visibly ticking (parse → diff → adjudicate). Time-lapse cut; on-screen caption with the true duration (e.g. "real time: 2m26s") | "It parses both documents into literal text spans — every extracted line must slice back out of the source, character-exact, or it's dropped. You watch it work." | Approach / Honesty |
| 00:42–01:00 (18s) | Plan page: the gap list (top-10 view) | "The diff: what this JD demands that this resume is silent on. Each gap is a claim — and every claim carries its receipts." | Approach |
| 01:00–01:15 (15s) | One GapCard expanded: JD span and resume span receipts highlighted | "The JD line that demands it. The resume line that's closest and still silent. Both are literal quotes — enforced in code, not asked for nicely." | Evidence |
| 01:15–01:24 (9s) | Click the Show-all expander: full gap count revealed | "The engine over-generates — so we show the top ten and tell you exactly how many more there are. Nothing hidden." | Honesty |
| 01:24–01:44 (20s) | Session room: interviewer question streams in token-by-token; the provider label ("Agnes" / failover label) clearly in frame | "Then you rehearse it, live. Every question traces to the gap that produced it, and the AI interviewer runs on Agnes — labeled, with a labeled failover." | Approach / Constraints |
| 01:44–01:52 (8s) | Timothy answers (typed; mic ONLY if the gate passed — see capture notes) and sends | "You answer in your own words. That matters for what comes next." | Approach |
| 01:52–02:16 (24s) | Debrief: one covered point with its transcript quote highlighted; then scroll to the `dropped[]` footer | "The debrief quotes *you* — every claim re-validated against the transcript by the same span machinery. Claims that fail validation land in a visible dropped count. No scores, no grades. What you covered, what you missed, in your own words." | Evidence / Honesty |
| 02:16–02:42 (26s) | Landing Evidence table: cursor moves down the baseline-vs-ours rows and the met/missed verdicts | "We measured it against criteria we locked before building — and we report the misses next to the hits. A plain chatbot quotes well when asked; nothing enforces it and nothing lets you check. Here, grounding is 100% by construction, quotes are mechanically validated, and failures are shown." | Evidence / Honesty |
| 02:42–03:00 (18s) | Close: README with CI badge, then the tagline card | "A modest claim, proven, beats a grand claim, asserted. The receipts are in the repo. DryRun — rehearse the interview you're about to have." | Trajectory |

Timing is a budget, not a straitjacket — trade seconds between shots, but land under 3:00 and keep the open (real compile) and close (baseline-vs-ours) fixed.

## Capture notes

- **Prod only, after the Saturday re-freeze.** Do not record against localhost or a preview URL. If a re-deploy happens mid-session, re-verify the pages before continuing.
- **The real compile is filmed once, uncut**, then compressed in the edit; caption the true wall-clock duration on screen. Never trim it silently — the honest duration is a deliberate beat.
- **`?mock=1` is allowed** for instant navigation shots (e.g. framing the plan or debrief layout), but any mock frame must be **visually labeled as mock in-frame** — or excluded from every claim and voiceover number. Shots 3–10's on-screen content should be the real Venture-JD run wherever possible.
- **Mic beat only if Timothy's live smoke passed** (flag on in prod, E2E-green). Otherwise shot 8 is typed — do not stage the mic.
- **Every number spoken or shown must match the README Evidence table exactly.** If the edit and the table disagree, the table wins — re-record the line. The 02:16 beat's numbers get re-checked Saturday AM after the latency results land.
- No LinkedIn mention, on-screen or in voiceover.

## Asset checklist

- Venture JD text (the real one Timothy compiled 30 Jul)
- Timothy's resume PDF
- Quiet room, ~1 hour block, screen recorder at 1080p+

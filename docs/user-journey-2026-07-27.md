# DryRun — user journey (pinned 27 Jul 2026)

The canonical journey for the rehearsal product. FE builds to this; Vedika's storyboard follows the happy path top-to-bottom. Rendered SVG: `user-journey-2026-07-27.svg`.

```mermaid
flowchart TB
    L["Landing — Rehearse the interview you're about to have"] --> C

    subgraph COMPILE["/compile"]
        C["Paste or upload JD + resume"] --> CV{"Both inputs present?"}
        CV -- "no" --> CE["Inline validation error"]
        CE --> C
        CV -- "yes" --> CT["Live stage trace<br/>parse jd ✓ · parse resume ✓ · diff gaps ✓"]
        CT -- "API/provider error" --> CF["Error + Retry<br/>(demo fallback: ?mock=1 offline)"]
        CF --> C
    end
    CT -- "gaps with receipts" --> P

    subgraph PLAN["/plan"]
        P["Gap report renders immediately"] --> PC["Plan compile fires on mount (skeleton)"]
        PC -- "ok" --> PQ["Questions with gapId receipts + STAR hints"]
        PC -- "zero gaps (thin docs)" --> PZ["Not-enough-signal notice → edit inputs"]
        PC -- "error" --> PR["Retry plan only<br/>(parses not re-bought)"]
        PR --> PC
        PQ --> PD["Receipts drawer:<br/>JD line ↔ resume line"]
    end
    PZ --> C
    PQ -- "Start the session" --> S

    subgraph SESSION["/session"]
        S["Interviewer asks q-n<br/>Agnes streaming"] -- "Agnes fails before first byte" --> SFO["Failover to OpenAI<br/>labeled in UI"]
        SFO --> SA
        S --> SA{"Answer mode"}
        SA -- "text" --> ST["Type + send"]
        SA -- "video" --> SV["Record → direct upload →<br/>transcribing → transcribed"]
        SV -- "upload/transcribe fails" --> SVF["Fall back to text<br/>(answer not lost)"]
        SVF --> ST
        ST --> SM{"META action"}
        SM -- "follow-up (≤2 per question)" --> S
        SM -- "advance" --> SN{"More questions?"}
        SN -- "yes" --> S
    end
    SN -- "no — or End session early" --> D

    subgraph DEBRIEF["/debrief"]
        D["Compile debrief (≤45s)"] -- "error" --> DR["Retry<br/>(transcript is client-held)"]
        DR --> D
        D --> DQ["Per question: covered with verbatim quotes<br/>+ timestamps · missed · not attempted"]
        DQ -- "click quote chip" --> DV["Video seeks to cited moment"]
        DQ --> DF["Honesty footer:<br/>N claims failed validation, withheld"]
        DF --> SS{"Save & share?"}
        SS -- "no" --> X1["Done — nothing stored anywhere"]
        SS -- "yes" --> SW["Write-once sessions row"]
        SW -- "save error" --> SR["Retry save"]
        SR --> SW
        SW --> X2["Read-only /debrief/[id] link<br/>anyone with link can view"]
    end

    RS[("sessionStorage<br/>dryrun-session-v1")] -. "refresh resumes any step (per-tab)" .-> PLAN
    RS -. " " .-> SESSION
    RS -. " " .-> DEBRIEF
```

## Edge-state inventory (every state the FE must render)

| # | Surface | State | Behavior | Copy stance |
|---|---|---|---|---|
| 1 | /compile | Empty/partial input | Submit disabled until both fields present (`&&`, fixing the old `\|\|` bug) | neutral |
| 2 | /compile | SSE stage trace | Streamed stages render as they land; elapsed timer | "compiling your interview" |
| 3 | /compile | API/provider error | Message + Retry; JSON error body surfaced (not `500 Internal Server Error`) | plain-language, no stack traces |
| 4 | /compile | Offline demo | `?mock=1` keyword-overlap fallback, visibly labeled "offline demo mode" | honest label mandatory |
| 5 | /plan | Gaps in, plan compiling | Gap cards render immediately; question list shows skeleton | progress, not spinner-only |
| 6 | /plan | Zero gaps | "Not enough signal in these documents" → back to /compile | never fabricate gaps |
| 7 | /plan | Plan error | Retry re-runs plan only (client re-sends stored parses) | — |
| 8 | /plan | Receipts drawer | Any gapId chip opens JD span + resume span side-by-side | verbatim quotes only |
| 9 | /session | Provider failover | Agnes error before first byte → one OpenAI retry; provider chip updates + "failover" tag | labeled, never silent |
| 10 | /session | Video: recording | Recorder states: idle → recording (timer) → uploading → transcribing → transcribed | — |
| 11 | /session | Video: failure | Any video step fails → composer falls back to text; typed draft preserved | "camera's optional" |
| 12 | /session | Follow-up cap | Client enforces ≤2 follow-ups per question regardless of model META | — |
| 13 | /session | Early end | "End session" always available → debrief with remaining questions as not-attempted | no guilt copy |
| 14 | /debrief | Compiling | Loading state ≤45s target with progress hint | — |
| 15 | /debrief | Not attempted | Question listed, "no claims made — nothing to cite" | neutral, not red |
| 16 | /debrief | Dropped quotes | Footer count of claims withheld by mechanical validation | always visible, never hidden |
| 17 | /debrief | Quote chip → video | Chip click seeks player to `videoTime`; text-only sessions highlight transcript instead | — |
| 18 | /debrief | Save & share | Explicit button; success → copyable read-only link; error → retry | "nothing stored unless you save · anyone with the link can view" |
| 19 | global | Refresh mid-journey | sessionStorage (`dryrun-session-v1`) restores current surface + state, per-tab | — |
| 20 | global | No scores anywhere | No numbers/grades/percentages on any surface (incl. loading + debrief) | the stance IS the copy |

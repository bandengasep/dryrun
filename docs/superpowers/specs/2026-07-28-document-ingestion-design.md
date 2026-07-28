# Document ingestion — PDF, DOCX, and screenshots for both inputs

> Status: designed 28 Jul 2026, approved by Timothy. Implementation plan follows.
> Scope: `web/` only. `packages/core` gains nothing — ingestion is transport, and the
> receipts engine must keep operating on plain strings.

## Context

DryRun asks for two documents and accepts exactly one format for them: text typed or
pasted into a textarea. The resume input has an Upload tab, but it rejects anything that
isn't `.txt`/`.md` (`web/app/compile/page.tsx:97`) with "paste the text instead."

Real documents don't arrive that way. Resumes are PDFs and DOCX files. Job descriptions
are PDFs, DOCX files, or postings behind a login. Timothy's own Venture BI/AI JD — the
posting the demo video opens on — arrived as a `.docx`, and getting it into the repo as
`jd-04.txt` took a manual `textutil` extraction plus hand-stripping of HR form
scaffolding. A judge who pastes their own resume hits the same wall the product is
supposed to remove.

The intended outcome: both inputs accept the formats documents actually come in, without
weakening the one claim the product rests on — that every gap cites a line the employer
actually wrote.

## What was measured first (28 Jul)

Three probes ran before any design was chosen. Two of them changed it.

**1. Fetching a JD by URL is dead for this demo.** The original idea was to accept a
posting URL. Measured against real postings with a browser User-Agent:

| Target | Result |
|---|---|
| NBS CareerGO (`nbscareergo.iotalents.com/jobposting/1352/...`) — **the demo's own posting** | HTTP 302 → login wall, 145 words of visible text |
| Lever board | HTTP 404, 297KB of JS shell, 30 words |
| Greenhouse board | HTTP 301 → 652 words (board index, not a posting) |

LinkedIn is already permanently parked out of runtime (ground rule 6: ToS + not
serverless-feasible). A URL box would therefore fail on the exact posting the video opens
on, and on the most recognizable job sites a judge might try. **URL ingestion is cut** —
moved to `post-hackathon-ideas.md` with this measurement as the recorded reason.

**2. A screenshot walks through the login wall — but is not verbatim.** Timothy's
workaround for CareerGO was a full-page PNG. Vision transcription (`gpt-5-mini`) of a
rendered JD page, scored against the known source text:

- 10 of 49 transcribed lines matched a source line exactly
- `Intern – BI/AI` (en-dash) came back as `Intern - BI/AI` (hyphen)
- one source paragraph became three transcribed lines, reproducing the page's visual
  wrapping rather than the document's structure
- 24.5s, ~1.4k input + ~2.1k output tokens for one page

**3. The model declines rather than invents.** An accidental all-black render came back as
"I can't detect any text in this image" — not a fabricated job posting. Useful, and worth
keeping as a regression check.

## The constraint those measurements impose

DryRun's span invariant is `sourceText.slice(start, end) === span.text`, enforced in
`locateSpan` (`packages/core/src/parsers/spans.ts`) and re-checked in the compile smoke.

If vision output is fed directly into `sourceText`, **that invariant still passes** — the
slice matches whatever string we stored — while every receipt now quotes text no employer
wrote. The mechanical check stays green and the product's central claim quietly becomes
false. Measurement 2 says this is not hypothetical: at minimum the dashes change.

This is the failure mode DryRun exists to avoid, so it gets a structural answer rather
than a disclaimer.

## Design

**One extractor, four modes, one rule.** The same component serves the JD input and the
resume input — they have identical needs and currently differ only by accident.

### The rule

> Extracted text lands in the editable textarea. It is never passed straight to compile.

The user reads it, edits it, and presses Compile — at which point it is confirmed text,
exactly as if pasted. For PDF/DOCX this is a formality. For screenshots it is the step
that keeps the receipts claim true. It also solves a problem found by hand: the Venture
`.docx` carried entity tick-boxes, empty job-grade cells, `EMPLOYEE NO:` and a signature
block, all of which would otherwise become "requirements" for the diff to adjudicate.

One flow for every mode — no special-casing, one code path, and the provenance label is
the only thing that varies.

### `web/app/lib/extract.ts` (new, client-side)

```ts
export type ExtractOrigin = "text-file" | "pdf" | "docx" | "image";
export interface Extracted { text: string; origin: ExtractOrigin; pages?: number; }
export async function extractFromFile(file: File): Promise<Extracted>;
export class ExtractError extends Error {}   // unsupported type, too large, empty result
```

Dispatch by extension and MIME:

- `.txt` / `.md` → `FileReader.readAsText` (the existing path, moved here)
- `.pdf` → `pdfjs-dist`: `getDocument({data})`, then `getTextContent()` per page. Join
  items using `hasEOL` for line breaks rather than a naive `join("")`, which loses word
  spacing. Cap at **15 pages**.
- `.docx` → `mammoth.extractRawText({ arrayBuffer })` → `result.value` (paragraphs already
  separated by blank lines)
- `.png` / `.jpg` / `.webp` → downscale client-side to max 1600px on the long edge via
  `canvas`, then POST to `/api/extract-image`

Reject > 10MB before reading, and reject a result under 40 characters as "couldn't read
any text from that file" — the empty-extraction case must be visible, not a silent blank
textarea.

### `web/app/api/extract-image/route.ts` (new)

`{ imageDataUrl }` → `{ text }`. `maxDuration = 60`. Uses `makeStructuredClient()` from
`web/app/lib/providers.ts` — this is a receipts-adjacent call, so it stays on OpenAI.
Plain `chat.completions` with an image part; no structured output needed. Stores nothing.
Rejects payloads over 8MB. Returns 422 with a clear message when the model reports no
readable text, so the "black image" case surfaces as a real error.

### UI contract (FE session owns the wiring)

Both inputs get the existing Paste/Upload toggle. `accept` becomes
`.txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.webp`. On success the textarea fills and a
provenance line appears above it:

| Origin | Line |
|---|---|
| `pdf` / `docx` / `text-file` | `Read from resume.pdf — edit anything that came through wrong.` |
| `image` | `Read from your screenshot. Check it before compiling — the receipts will quote this text.` |

Screenshots additionally show a one-time note that transcription is approximate. Nothing
is disabled and nothing is auto-submitted; the Compile button behaves exactly as today.

## Ownership split (two sessions are live in this repo)

- **This session (backend):** `web/app/lib/extract.ts`, `web/app/api/extract-image/route.ts`,
  dependency + lockfile changes, tests.
- **FE session:** `web/app/compile/page.tsx` and its CSS — the toggle, `accept` list,
  provenance line, error rendering.

The seam is `extractFromFile()`. It is pure (File in, `Extracted` out, no React), so both
sides can land independently.

## Dependencies (approved 28 Jul, ground rule 9)

`pdfjs-dist` and `mammoth`, **`web/` only** — `packages/core` stays free of them. Both are
pure JS with no native postinstall, so `allowBuilds` needs no new entry. If pnpm 11's
`minimumReleaseAge` refuses either version, add a `minimumReleaseAgeExclude` entry
alongside the existing `better-sqlite3@13.0.1`. Lockfile is committed (CI is
`--frozen-lockfile`).

**Top implementation risk: the pdf.js worker.** Worker loading is pdf.js's classic
bundler pain point and Next 16 uses Turbopack. Preferred:
`GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url), { type: "module" })`.
Fallback if Turbopack won't resolve it: run worker-less by importing the legacy build and
leaving `workerSrc` unset — slower and it blocks the main thread, acceptable for a
one-shot parse of a resume. Resolve this **before** wiring UI; if neither works, PDF
degrades to the same "paste the text instead" message and DOCX still ships.

## Failure modes, stated

- Vision transcription is approximate — measured above, disclosed in the UI, and mitigated
  by the confirm step rather than hidden.
- Scanned/photographed resumes (image-only PDFs) yield no text layer; `pdfjs` returns
  empty and the user gets the "couldn't read any text" error, not a blank box. Routing
  those through the vision path is a follow-up, not this change.
- Multi-column resume PDFs can interleave columns in reading order. The confirm step is
  the mitigation; the user sees it and fixes it.
- The vision call adds ~25s before compile even starts. It is a separate, visible step, so
  it does not enter the compile latency budget — but it must show a spinner or it will read
  as a hang.

## Verification

1. **Unit, offline.** `web/` has no test runner and does not get one this week, so the
   testable logic must be reachable from core's vitest: keep the pure parts —
   `joinTextItems(items)`, `assertUsableText(text)`, extension→mode dispatch — free of
   `File`, `canvas`, and `fetch`, and import them into a core test by relative path.
   (Cross-package relative TS import is unproven in vitest here; it did work under
   `node --experimental-strip-types` when `readSSE` was validated on 27 Jul. If vitest
   refuses the path, move those pure helpers into `packages/core/src/ingest/` and have
   `extract.ts` import them — core owning pure string mechanics is consistent with
   `spans.ts`.) Cases: line-joining over a synthetic `getTextContent()` item list
   including `hasEOL`; `ExtractError` on unsupported extension, on oversize, and on a
   sub-40-character result.
2. **Round-trip fidelity**: extract `jd-04.txt` → `.docx` → back through `mammoth`, and
   assert the requirement bullets survive verbatim. This is the check that the *lossless*
   paths really are lossless.
3. **Vision regression**: the all-black image must produce a 422, never prose.
4. **End-to-end**: upload a PDF resume + the Venture JD `.docx` on the preview deploy,
   confirm both textareas fill, edit one, compile, and confirm every resulting gap's
   `jdSpan` still slices back to `sourceText` — the same assertion the 27 Jul smoke ran.
5. **CI**: `pnpm --filter @dryrun/core test`, both typechecks, `next build`.

## Explicitly not in scope

JD-by-URL (cut, with evidence) · OCR of scanned PDFs · storing uploaded files anywhere ·
any change to `packages/core` · resume rewriting (permanent non-goal).

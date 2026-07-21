# Commit 1 — Schemas + Strict Structured-Output Parsers: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@dryrun/core` parses a raw JD and resume into typed `RequirementLine[]` / `ResumeLine[]` where every line carries a char-offset receipt into the source text, via OpenAI strict structured outputs — plus the session's doc restructure (AGENTS.md canonical) and the PR for Vedika's `dryrun-FE-V0`.

**Architecture:** Models never emit char offsets (they're unreliable at counting) — they emit **verbatim quotes** under strict structured outputs (`responses.parse` + `zodTextFormat`); a deterministic locator (`locateSpan`) computes offsets afterwards, so the receipts invariant `sourceText.slice(start, end) === span.text` is enforced by code, not trusted to the model. Quotes that fail to locate are surfaced in a `dropped` array — never silently discarded — because unlocatable quotes are exactly what the citation-validity eval will count. Wire schemas (model-facing) live in `parsers/`; the shared domain contract stays in `schemas/`.

**Tech Stack:** TypeScript 5.x ESM, zod ^4.4.3, `openai` ^6.48.0 (verified 2026-07-21: peer `zod: ^3.25 || ^4.0` — compatible), vitest 4, pnpm workspace, Node 22.

## Global Constraints

- Runtime = OpenAI only; default model `gpt-5-mini`, fallback `gpt-4.1-mini` (CLAUDE.md stack lock).
- Receipts law: every emitted line satisfies `sourceText.slice(span.start, span.end) === span.text`.
- CI runs with **no secrets**: unit tests stub the OpenAI client; the live smoke suite `describe.skipIf(!process.env.OPENAI_API_KEY)` self-skips.
- New deps this commit: `openai@^6.48.0` (runtime, in stack lock) + `@types/node@^22` (dev, types only). Nothing else.
- Verified API shape (Context7, 2026-07-21): `import { zodTextFormat } from "openai/helpers/zod"`; `client.responses.parse({ model, input, text: { format: zodTextFormat(Schema, "name") } })`; parsed result on `response.output_parsed` (undefined/null on refusal).
- `packages/core/src` stays free of Node builtins (framework-agnostic library); Node imports allowed in `test/` only.
- All work on branch `timothy`; PR to `main`; CI (`verify`) gates merge.

---

### Task 0: Docs restructure + decision log + Vedika PR

**Files:**
- Create: `AGENTS.md` (canonical ops doc = current CLAUDE.md content + updates below)
- Modify: `CLAUDE.md` (becomes `@AGENTS.md` import + Claude-only notes)
- Modify: `docs/decision-log.md` (2026-07-21 entries)
- Modify: `.env.example` (`SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SECRET_KEY`)

**Content updates going into AGENTS.md (vs old CLAUDE.md):**
1. Branch discipline: Vedika's FE work currently lives on `dryrun-FE-V0` (not `vedika`).
2. New "FE status (21 Jul)" note under Vedika handoff points: pages landed (landing, compile, results, compiler/[lang], about); `web/app/api/compile/route.ts` is a mock heuristic posting `{jd, resume}` → `{gaps: Gap[]}` typed off `@dryrun/core` — gets re-backed by core parsers+diff at Commit 2 with zero UI changes; **results page readiness bar (READINESS_PERCENT=65) is a cut-list violation — blocking her merge, she swaps it (e.g., per-kind gap counts).**
3. Supabase env naming: `SUPABASE_SECRET_KEY` (`sb_secret_...`, replaces legacy service_role per Supabase's new API keys; verified via Context7 2026-07-21).

**Decision-log entries (2026-07-21):**
- AGENTS.md made canonical ops doc; CLAUDE.md = `@AGENTS.md` import (verified: Claude Code reads only CLAUDE.md natively; imports supported).
- Parser receipts strategy: models emit verbatim quotes, never offsets; spans computed by deterministic `locateSpan`; unlocatable quotes surface in `dropped` (feeds citation-validity eval).
- `openai@^6.48.0` added to core (peer `zod ^3.25 || ^4.0` OK with our zod 4); `@types/node` dev-only.
- `.env.example` renamed Supabase var to `SUPABASE_SECRET_KEY` (new API keys replace service_role/anon).
- Vedika FE V0 arrived on `dryrun-FE-V0`; PR opened to main; readiness bar flagged as cut-list blocker (her fix).

**Steps:**
- [ ] Write `AGENTS.md`, rewrite `CLAUDE.md`, append decision-log, fix `.env.example`
- [ ] Commit: `docs: make AGENTS.md canonical; log 21 Jul decisions; SUPABASE_SECRET_KEY`
- [ ] `gh pr create --base main --head dryrun-FE-V0` — body lists contents, the readiness-bar blocker, merge-after-her-fix + CI green

### Task 1: Domain schemas — `ParsedJD` / `ParsedResume` / `DroppedLine`

**Files:**
- Modify: `packages/core/src/schemas/index.ts` (append; existing schemas untouched)
- Test: `packages/core/test/schemas.test.ts` (append)
- Modify: `packages/core/package.json` (add deps), `packages/core/tsconfig.json` (`"types": ["node"]`)

**Interfaces produced:** `DroppedLine { text, quote, reason: "quote_not_found" }`; `ParsedJD { sourceText, lines: RequirementLine[], dropped: DroppedLine[] }`; `ParsedResume` same shape with `ResumeLine[]`.

- [ ] **Step 1: failing tests** — append to `test/schemas.test.ts`:

```ts
import { ParsedJD, DroppedLine } from "../src/schemas";

describe("ParsedJD — parser output contract", () => {
  it("carries lines with receipts plus dropped quotes side by side", () => {
    const parsed = ParsedJD.parse({
      sourceText: "Requires 3+ years of SQL and dbt.",
      lines: [
        {
          id: "jd-1",
          text: "3+ years of SQL",
          span: { start: 9, end: 24, text: "3+ years of SQL" },
        },
      ],
      dropped: [
        { text: "dbt experience", quote: "dbt exp.", reason: "quote_not_found" },
      ],
    });
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.dropped[0].reason).toBe("quote_not_found");
  });

  it("rejects a dropped line with an unknown reason", () => {
    expect(() =>
      DroppedLine.parse({ text: "x", quote: "y", reason: "other" }),
    ).toThrow();
  });
});
```

- [ ] **Step 2:** `pnpm --filter @dryrun/core test` → FAIL (no export `ParsedJD`)
- [ ] **Step 3:** append to `src/schemas/index.ts`:

```ts
/**
 * A line the parser extracted but could not anchor to the source text. Kept —
 * never silently dropped — because unlocatable quotes are exactly what the
 * citation-validity eval counts.
 */
export const DroppedLine = z.object({
  text: z.string(),
  quote: z.string(),
  reason: z.literal("quote_not_found"),
});
export type DroppedLine = z.infer<typeof DroppedLine>;

/** Parser output for a JD: located requirement lines + honest failures. */
export const ParsedJD = z.object({
  sourceText: z.string(),
  lines: z.array(RequirementLine),
  dropped: z.array(DroppedLine),
});
export type ParsedJD = z.infer<typeof ParsedJD>;

/** Parser output for a resume: located evidence lines + honest failures. */
export const ParsedResume = z.object({
  sourceText: z.string(),
  lines: z.array(ResumeLine),
  dropped: z.array(DroppedLine),
});
export type ParsedResume = z.infer<typeof ParsedResume>;
```

- [ ] **Step 4:** add `"openai": "^6.48.0"` to dependencies and `"@types/node": "^22"` to devDependencies in `packages/core/package.json`; set `"types": ["node"]` in `packages/core/tsconfig.json`; `pnpm install`
- [ ] **Step 5:** `pnpm --filter @dryrun/core test` → PASS; `pnpm --filter @dryrun/core typecheck` → clean
- [ ] **Step 6:** Commit: `feat(core): ParsedJD/ParsedResume/DroppedLine schemas; add openai dep`

### Task 2: Deterministic span locator

**Files:**
- Create: `packages/core/src/parsers/spans.ts`
- Test: `packages/core/test/spans.test.ts`

**Interfaces produced:** `locateSpan(source: string, quote: string, fromIndex?: number): SourceSpan | null`

- [ ] **Step 1: failing tests** — `test/spans.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { locateSpan } from "../src/parsers/spans";

describe("locateSpan — receipts are computed, never trusted", () => {
  const source = "Requirements:\n- 3+ years of SQL\n- SQL modelling with dbt\n";

  it("locates an exact quote and satisfies the receipts invariant", () => {
    const span = locateSpan(source, "3+ years of SQL");
    expect(span).not.toBeNull();
    expect(source.slice(span!.start, span!.end)).toBe(span!.text);
  });

  it("finds a later duplicate when fromIndex skips the first occurrence", () => {
    const first = locateSpan(source, "SQL")!;
    const second = locateSpan(source, "SQL", first.end)!;
    expect(second.start).toBeGreaterThan(first.end - 1);
    expect(source.slice(second.start, second.end)).toBe("SQL");
  });

  it("tolerates whitespace drift in the model's quote", () => {
    const span = locateSpan("skills:\n  SQL and\n  Python", "SQL and Python");
    expect(span).not.toBeNull();
    expect(span!.text).toBe("SQL and\n  Python");
  });

  it("returns null for absent or empty quotes", () => {
    expect(locateSpan(source, "Kubernetes")).toBeNull();
    expect(locateSpan(source, "   ")).toBeNull();
  });

  it("escapes regex metacharacters in quotes", () => {
    const s = "Comp (incl. bonus): $120k+";
    const span = locateSpan(s, "(incl. bonus): $120k+");
    expect(span).not.toBeNull();
    expect(s.slice(span!.start, span!.end)).toBe(span!.text);
  });
});
```

- [ ] **Step 2:** run → FAIL (module not found)
- [ ] **Step 3:** `src/parsers/spans.ts`:

```ts
import type { SourceSpan } from "../schemas";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Locate `quote` inside `source` and return its char-offset span, or null.
 * Exact match first; then a whitespace-tolerant retry (models sometimes
 * collapse newlines/spaces when quoting). Offsets always index the ORIGINAL
 * source, so the receipts invariant holds by construction:
 *   source.slice(span.start, span.end) === span.text
 */
export function locateSpan(
  source: string,
  quote: string,
  fromIndex = 0,
): SourceSpan | null {
  const trimmed = quote.trim();
  if (trimmed.length === 0) return null;

  const exact = source.indexOf(trimmed, fromIndex);
  if (exact !== -1) {
    return { start: exact, end: exact + trimmed.length, text: trimmed };
  }

  const pattern = trimmed.split(/\s+/).map(escapeRegExp).join("\\s+");
  const re = new RegExp(pattern, "g");
  re.lastIndex = fromIndex;
  const m = re.exec(source);
  if (m) {
    return { start: m.index, end: m.index + m[0].length, text: m[0] };
  }
  return null;
}
```

- [ ] **Step 4:** run → PASS
- [ ] **Step 5:** Commit: `feat(core): locateSpan — deterministic receipt locator`

### Task 3: Wire schemas + parsers (stubbed-client TDD)

**Files:**
- Create: `packages/core/src/parsers/wire.ts`, rewrite `packages/core/src/parsers/index.ts`
- Modify: `packages/core/src/index.ts` (`export * from "./parsers";`)
- Test: `packages/core/test/parsers.test.ts`

**Interfaces produced:** `parseJD(jdText, { client, model? }): Promise<ParsedJD>`; `parseResume(resumeText, { client, model? }): Promise<ParsedResume>`; `ParserError`; `DEFAULT_MODEL = "gpt-5-mini"`, `FALLBACK_MODEL = "gpt-4.1-mini"`; wire schemas `JDWire { requirements: [{ requirement, quote }] }`, `ResumeWire { lines: [{ quote }] }`.

- [ ] **Step 1: failing tests** — `test/parsers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type OpenAI from "openai";
import { parseJD, parseResume, ParserError } from "../src/parsers";
import { ParsedJD, ParsedResume } from "../src/schemas";

function stubClient(parsed: unknown): OpenAI {
  return {
    responses: { parse: async (_params: unknown) => ({ output_parsed: parsed }) },
  } as unknown as OpenAI;
}

const JD = "We need 3+ years of SQL and strong Python. Airflow is a plus.";

describe("parseJD — wire → domain with computed receipts", () => {
  it("maps quotes to located RequirementLines with sequential ids", async () => {
    const client = stubClient({
      requirements: [
        { requirement: "3+ years of SQL", quote: "3+ years of SQL" },
        { requirement: "Strong Python", quote: "strong Python" },
      ],
    });
    const parsed = await parseJD(JD, { client });
    ParsedJD.parse(parsed); // validates against the shared contract
    expect(parsed.lines.map((l) => l.id)).toEqual(["jd-1", "jd-2"]);
    for (const line of parsed.lines) {
      expect(JD.slice(line.span.start, line.span.end)).toBe(line.span.text);
    }
  });

  it("routes unlocatable quotes to dropped — never silently discarded", async () => {
    const client = stubClient({
      requirements: [
        { requirement: "Kubernetes", quote: "K8s experience required" },
      ],
    });
    const parsed = await parseJD(JD, { client });
    expect(parsed.lines).toHaveLength(0);
    expect(parsed.dropped).toEqual([
      {
        text: "Kubernetes",
        quote: "K8s experience required",
        reason: "quote_not_found",
      },
    ]);
  });

  it("throws ParserError when the model refuses (no structured output)", async () => {
    await expect(parseJD(JD, { client: stubClient(null) })).rejects.toThrow(
      ParserError,
    );
  });
});

describe("parseResume — same family, cv- ids", () => {
  it("maps verbatim resume lines with receipts", async () => {
    const RESUME = "Wrote SQL in BigQuery.\nCleaned data with pandas.";
    const client = stubClient({
      lines: [
        { quote: "Wrote SQL in BigQuery." },
        { quote: "Cleaned data with pandas." },
      ],
    });
    const parsed = await parseResume(RESUME, { client });
    ParsedResume.parse(parsed);
    expect(parsed.lines.map((l) => l.id)).toEqual(["cv-1", "cv-2"]);
    expect(parsed.lines[1].text).toBe("Cleaned data with pandas.");
  });
});
```

- [ ] **Step 2:** run → FAIL (no export `parseJD`)
- [ ] **Step 3:** `src/parsers/wire.ts`:

```ts
import { z } from "zod";

/**
 * Wire schemas: what the MODEL emits under strict structured outputs. Models
 * are unreliable at char offsets, so the wire format carries verbatim quotes
 * only — offsets are computed by locateSpan() afterwards. Implementation
 * detail of the parsers; the shared contract lives in src/schemas.
 */
export const JDWire = z.object({
  requirements: z.array(
    z.object({
      /** One atomic requirement, normalized ("3+ years of SQL"). */
      requirement: z.string(),
      /** Verbatim substring of the JD that demands it — exact characters. */
      quote: z.string(),
    }),
  ),
});
export type JDWire = z.infer<typeof JDWire>;

export const ResumeWire = z.object({
  lines: z.array(
    z.object({
      /** Verbatim substring of the resume — one atomic bullet/sentence. */
      quote: z.string(),
    }),
  ),
});
export type ResumeWire = z.infer<typeof ResumeWire>;
```

- [ ] **Step 4:** `src/parsers/index.ts`:

```ts
import { zodTextFormat } from "openai/helpers/zod";
import type OpenAI from "openai";
import type {
  DroppedLine,
  ParsedJD,
  ParsedResume,
  RequirementLine,
  ResumeLine,
} from "../schemas";
import { JDWire, ResumeWire } from "./wire";
import { locateSpan } from "./spans";

export { locateSpan } from "./spans";
export { JDWire, ResumeWire } from "./wire";

export const DEFAULT_MODEL = "gpt-5-mini";
export const FALLBACK_MODEL = "gpt-4.1-mini";

export interface ParserOptions {
  client: OpenAI;
  /** Override the runtime model (stack lock: gpt-5-mini, fallback gpt-4.1-mini). */
  model?: string;
}

/** Raised when the model returns no structured output (refusal/empty). */
export class ParserError extends Error {}

const JD_SYSTEM_PROMPT = [
  "You extract atomic hiring requirements from a job description.",
  "Return every distinct requirement: skills, tools, years of experience, education, and responsibilities that imply a skill.",
  'For each entry set `requirement` to one atomic requirement in normalized form (e.g. "3+ years of SQL"). A sentence demanding several skills becomes several entries.',
  "Set `quote` to the EXACT substring of the job description that states the requirement: copy the characters verbatim — same casing, spelling, punctuation and spacing. Never paraphrase inside `quote`.",
].join("\n");

const RESUME_SYSTEM_PROMPT = [
  "You split a resume into atomic lines of evidence.",
  "Return every bullet, sentence or fragment that could evidence a skill, tool, credential or experience — one entry per atomic claim.",
  "Set `quote` to the EXACT substring of the resume: copy the characters verbatim — same casing, spelling, punctuation and spacing. Never paraphrase.",
].join("\n");

export async function parseJD(
  jdText: string,
  opts: ParserOptions,
): Promise<ParsedJD> {
  const response = await opts.client.responses.parse({
    model: opts.model ?? DEFAULT_MODEL,
    input: [
      { role: "system", content: JD_SYSTEM_PROMPT },
      { role: "user", content: jdText },
    ],
    text: { format: zodTextFormat(JDWire, "jd_requirements") },
  });
  const wire = response.output_parsed;
  if (!wire) {
    throw new ParserError(
      "JD parse returned no structured output (refusal or empty response)",
    );
  }

  const lines: RequirementLine[] = [];
  const dropped: DroppedLine[] = [];
  for (const item of wire.requirements) {
    // Duplicate quotes anchor to their first occurrence — acceptable at
    // Commit 1; revisit if the citation-validity eval flags collisions.
    const span = locateSpan(jdText, item.quote);
    if (span) {
      lines.push({ id: `jd-${lines.length + 1}`, text: item.requirement, span });
    } else {
      dropped.push({
        text: item.requirement,
        quote: item.quote,
        reason: "quote_not_found",
      });
    }
  }
  return { sourceText: jdText, lines, dropped };
}

export async function parseResume(
  resumeText: string,
  opts: ParserOptions,
): Promise<ParsedResume> {
  const response = await opts.client.responses.parse({
    model: opts.model ?? DEFAULT_MODEL,
    input: [
      { role: "system", content: RESUME_SYSTEM_PROMPT },
      { role: "user", content: resumeText },
    ],
    text: { format: zodTextFormat(ResumeWire, "resume_lines") },
  });
  const wire = response.output_parsed;
  if (!wire) {
    throw new ParserError(
      "Resume parse returned no structured output (refusal or empty response)",
    );
  }

  const lines: ResumeLine[] = [];
  const dropped: DroppedLine[] = [];
  for (const item of wire.lines) {
    const span = locateSpan(resumeText, item.quote);
    if (span) {
      lines.push({ id: `cv-${lines.length + 1}`, text: span.text, span });
    } else {
      dropped.push({ text: item.quote, quote: item.quote, reason: "quote_not_found" });
    }
  }
  return { sourceText: resumeText, lines, dropped };
}
```

- [ ] **Step 5:** `src/index.ts` gains `export * from "./parsers";`
- [ ] **Step 6:** run tests → PASS; typecheck → clean
- [ ] **Step 7:** Commit: `feat(core): parseJD/parseResume via responses.parse + zodTextFormat`

### Task 4: Fixtures + live smoke suite (auto-skips without key)

**Files:**
- Create: `packages/core/test/fixtures/jd-01.txt`, `packages/core/test/fixtures/resume-01.txt` (hand-written Data-Analyst JD × MSBA-grad resume pair; deliberate gaps: dbt absent, stats coursework-only, Tableau weak, 6-month vs 3+ years SQL)
- Create: `packages/core/test/setup.ts` (loads repo-root `.env` when present)
- Create: `packages/core/test/parsers.live.test.ts`
- Modify: `packages/core/vitest.config.ts` (`setupFiles: ["test/setup.ts"]`)

- [ ] **Step 1:** `test/setup.ts`:

```ts
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

// Load repo-root .env (OPENAI_API_KEY) for the live smoke suite.
// CI has no .env — the live suite then self-skips.
const envPath = resolve(import.meta.dirname, "../../../.env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
```

- [ ] **Step 2:** `test/parsers.live.test.ts` — asserts, for both fixtures: ≥5 located lines; the receipts invariant on every line; location rate ≥ 0.8 (`lines/(lines+dropped)`); 120s timeouts. Run with key → PASS; `env -u OPENAI_API_KEY pnpm --filter @dryrun/core test` → suite reports *skipped*.

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import OpenAI from "openai";
import { parseJD, parseResume } from "../src/parsers";

const hasKey = Boolean(process.env.OPENAI_API_KEY);
const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, "fixtures", name), "utf8");

describe.skipIf(!hasKey)(
  "parsers — live smoke (needs OPENAI_API_KEY; auto-skips in CI)",
  () => {
    it("JD fixture → located, receipt-true requirement lines", { timeout: 120_000 }, async () => {
      const client = new OpenAI();
      const jd = fixture("jd-01.txt");
      const parsed = await parseJD(jd, { client });
      expect(parsed.lines.length).toBeGreaterThanOrEqual(5);
      for (const line of parsed.lines) {
        expect(jd.slice(line.span.start, line.span.end)).toBe(line.span.text);
      }
      const total = parsed.lines.length + parsed.dropped.length;
      expect(parsed.lines.length / total).toBeGreaterThanOrEqual(0.8);
    });

    it("resume fixture → located, receipt-true evidence lines", { timeout: 120_000 }, async () => {
      const client = new OpenAI();
      const resume = fixture("resume-01.txt");
      const parsed = await parseResume(resume, { client });
      expect(parsed.lines.length).toBeGreaterThanOrEqual(5);
      for (const line of parsed.lines) {
        expect(resume.slice(line.span.start, line.span.end)).toBe(line.span.text);
      }
      const total = parsed.lines.length + parsed.dropped.length;
      expect(parsed.lines.length / total).toBeGreaterThanOrEqual(0.8);
    });
  },
);
```

- [ ] **Step 3:** Commit: `test(core): fixture pair + live parser smoke (skips without key)`

### Task 5: Adversarial review workflow + PR

- [ ] Run multi-lens review workflow (correctness / receipts-law compliance / spec-vs-CLAUDE.md drift / test-coverage), verify each finding adversarially, fix confirmed ones
- [ ] `pnpm typecheck && pnpm test` green at root; push `timothy`; `gh pr create --base main --head timothy`

## Verification

1. `pnpm --filter @dryrun/core typecheck` — clean.
2. `pnpm --filter @dryrun/core test` — all unit suites green; live suite runs (key present locally) with receipts invariant asserted on every returned line.
3. `env -u OPENAI_API_KEY pnpm --filter @dryrun/core test` — live suite skips; everything else green (CI equivalence check).
4. `pnpm --filter web build` — Vedika's app still builds against the extended `@dryrun/core` exports (schema family only appended, nothing breaking).
5. CI `verify` green on the PR.

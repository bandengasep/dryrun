// JD & resume parsers. OpenAI Responses API strict structured output via
// `responses.parse` + `zodTextFormat`. Models emit verbatim quotes, never
// offsets; locateSpan() computes every receipt deterministically, and quotes
// that fail to locate surface in `dropped` (input to the citation-validity
// eval) — never silently discarded.
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
  /**
   * Spread LAST into the responses.parse request params. Quality-affecting
   * levers (e.g. `{ reasoning: { effort: "low" } }`) stay eval-only — never
   * set by product code, because they can change what the model returns on
   * the receipts-critical parse stage. Quality-neutral transport params
   * (e.g. `{ service_tier: "priority" }` — same model, same outputs, only
   * serving speed) may be set by product code behind an env flag; see
   * `structuredRequestOverrides` in web/app/lib/providers.ts.
   */
  requestOverrides?: Record<string, unknown>;
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
    ...opts.requestOverrides,
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
    ...opts.requestOverrides,
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
      dropped.push({
        text: item.quote,
        quote: item.quote,
        reason: "quote_not_found",
      });
    }
  }
  return { sourceText: resumeText, lines, dropped };
}

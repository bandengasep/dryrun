import { z } from "zod";

/**
 * A character-offset span into a source document (JD or resume). Every receipt
 * anchors to one of these — this is what makes a gap traceable back to the text.
 */
export const SourceSpan = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string(),
});
export type SourceSpan = z.infer<typeof SourceSpan>;

/** One atomic requirement extracted from the job description. */
export const RequirementLine = z.object({
  id: z.string(),
  text: z.string(),
  span: SourceSpan,
});
export type RequirementLine = z.infer<typeof RequirementLine>;

/** One atomic line extracted from the resume. */
export const ResumeLine = z.object({
  id: z.string(),
  text: z.string(),
  span: SourceSpan,
});
export type ResumeLine = z.infer<typeof ResumeLine>;

/** The typed set-difference verdict for a single JD requirement. */
export const GapKind = z.enum([
  "missing_skill",
  "weak_evidence",
  "strong_differentiator",
]);
export type GapKind = z.infer<typeof GapKind>;

/**
 * A gap and its receipts: the JD requirement that demands it, plus the resume line
 * (if any) that speaks to it. `resumeLineId` / `resumeSpan` are null when nothing in
 * the resume matches — that is itself the evidence for a `missing_skill`.
 */
export const Gap = z.object({
  id: z.string(),
  kind: GapKind,
  requirementId: z.string(),
  jdSpan: SourceSpan,
  resumeLineId: z.string().nullable(),
  resumeSpan: SourceSpan.nullable(),
  rationale: z.string(),
});
export type Gap = z.infer<typeof Gap>;

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

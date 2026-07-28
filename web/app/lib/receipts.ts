// Pure helpers for rendering receipts. No React, no fetching — everything here
// is arithmetic over data the client already holds, so a receipt can never be
// something the UI made up while rendering.

import type { CompileResult, Gap, GapKind, SessionPlan, SourceSpan } from "@dryrun/core";

export const KIND_LABEL: Record<GapKind, string> = {
  missing_skill: "missing",
  weak_evidence: "weak",
  strong_differentiator: "strong",
};

export const KIND_PLURAL: Record<GapKind, string> = {
  missing_skill: "missing skills",
  weak_evidence: "weak evidence",
  strong_differentiator: "strong differentiators",
};

export const KIND_ORDER: GapKind[] = [
  "missing_skill",
  "weak_evidence",
  "strong_differentiator",
];

export function countByKind(gaps: Gap[]): Record<GapKind, number> {
  const counts: Record<GapKind, number> = {
    missing_skill: 0,
    weak_evidence: 0,
    strong_differentiator: 0,
  };
  for (const gap of gaps) counts[gap.kind] += 1;
  return counts;
}

/**
 * The 1-based line the span starts on.
 *
 * Spans are character offsets, so this is counted from the source text rather
 * than stored — which means "JD L14" is derived from the same offsets the quote
 * is, and the two can't disagree.
 */
export function lineNumberFor(sourceText: string, span: SourceSpan): number {
  let line = 1;
  const upto = Math.min(span.start, sourceText.length);
  for (let i = 0; i < upto; i++) {
    if (sourceText.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

/**
 * A short label for a gap: the atomic requirement the parser extracted, which
 * is shorter than the verbatim JD sentence and is what the requirement is
 * *about*. Falls back to the verbatim quote if the requirement can't be
 * resolved — a slightly long heading beats a heading we invented.
 */
export function gapTitle(gap: Gap, compile: CompileResult | null): string {
  const requirement = compile?.jd.lines.find((l) => l.id === gap.requirementId);
  return requirement?.text ?? gap.jdSpan.text;
}

/**
 * Verify a span still quotes what it claims to. The compile located these
 * offsets server-side; this re-checks them against the source the client holds,
 * so a mismatch (a stale session, a hand-edited storage blob) shows as "couldn't
 * be verified" rather than as a confident quote of the wrong text.
 */
export function spanMatchesSource(sourceText: string, span: SourceSpan): boolean {
  return sourceText.slice(span.start, span.end) === span.text;
}

/**
 * Reshape a SessionPlan into the CompileResult shape ReceiptsDrawer expects,
 * so /debrief can reuse the exact same drawer /plan uses rather than building
 * a second "show me what this is based on" component.
 *
 * `lines` and `dropped` come back empty on purpose: ReceiptsDrawer and
 * gapTitle only ever read `sourceText` and the gap's own spans — the
 * requirement-line lookup in gapTitle falls back to `gap.jdSpan.text` when a
 * line can't be resolved, which is exactly what happens here, honestly.
 */
export function planToCompileShape(plan: SessionPlan): CompileResult {
  return {
    jd: { sourceText: plan.jdText, lines: [], dropped: [] },
    resume: { sourceText: plan.resumeText, lines: [], dropped: [] },
    gaps: plan.gaps,
  };
}

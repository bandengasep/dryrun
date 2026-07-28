import { z } from "zod";

/**
 * Wire schema for the debrief call: what the MODEL emits under strict structured
 * outputs.
 *
 * Two absences are the design:
 *
 * 1. There is nowhere to put a score, grade, rating, or verdict. The no-scores
 *    stance is enforced by the schema rather than by asking the model nicely —
 *    a field that doesn't exist cannot be filled in.
 * 2. There is no `gapId`. The debrief inherits it from the plan, so the receipt
 *    chain question → gap → JD/resume spans cannot be rewritten at debrief time.
 *
 * `quote` is a plain string, not a span. Offsets are computed here by locateSpan
 * against the real transcript — the same reason the parsers never let a model
 * emit offsets. A quote that fails to re-locate is demoted to `dropped`.
 */
export const DebriefWire = z.object({
  questions: z.array(
    z.object({
      /** Must echo a questionId from the prompt payload. */
      questionId: z.string(),
      summary: z.string(),
      covered: z.array(
        z.object({
          claim: z.string(),
          /** Verbatim substring of the candidate's own answer. */
          quote: z.string(),
        }),
      ),
      missed: z.array(z.object({ claim: z.string() })),
    }),
  ),
});
export type DebriefWire = z.infer<typeof DebriefWire>;

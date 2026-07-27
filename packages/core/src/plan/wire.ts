import { z } from "zod";
import { QuestionKind, StarHints } from "../schemas";

/**
 * Wire schema for the plan-compile call: what the MODEL emits under strict
 * structured outputs. It cites gaps by id only — the receipts (JD span, resume
 * span) are carried by the Gap objects the compiler already holds, so a question
 * can never arrive with a fabricated span. Ids are absent by design: the
 * compiler assigns `q-N`, mirroring how diffGaps assigns `gap-N`.
 */
export const PlanWire = z.object({
  questions: z.array(
    z.object({
      /** Must echo one of the Gap ids from the prompt payload. */
      gapId: z.string(),
      kind: QuestionKind,
      question: z.string(),
      /** Required for behavioral questions, null for conceptual ones. */
      starHints: StarHints.nullable(),
      rationale: z.string(),
    }),
  ),
});
export type PlanWire = z.infer<typeof PlanWire>;

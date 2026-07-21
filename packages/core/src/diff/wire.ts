import { z } from "zod";
import { GapKind } from "../schemas";

/**
 * Wire schema for the adjudication stage: what the MODEL emits under strict
 * structured outputs. One verdict per JD requirement. The model only ever
 * cites resume lines by id — spans were computed at parse time, so receipts
 * are attached deterministically in diffGaps, never trusted from the model.
 */
export const DiffWire = z.object({
  verdicts: z.array(
    z.object({
      /** Must echo a RequirementLine id from the prompt payload. */
      requirementId: z.string(),
      kind: GapKind,
      /** A candidate ResumeLine id, or null when kind is missing_skill. */
      resumeLineId: z.string().nullable(),
      rationale: z.string(),
    }),
  ),
});
export type DiffWire = z.infer<typeof DiffWire>;

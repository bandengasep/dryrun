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

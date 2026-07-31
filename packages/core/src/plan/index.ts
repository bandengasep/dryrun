// Session-plan compiler. One batched strict-SO call turns measured gaps into the
// questions this candidate is likely to face. The model cites gaps by id only —
// every receipt is attached here from the Gap objects we already hold, so a
// question can never carry a span the model invented.
//
// Grounding guards (the mirror of diff's citation guard):
//   - a question citing an unknown gapId → PlanError (never rendered, never
//     silently rehomed to some other gap)
//   - a behavioral question without STAR hints → PlanError (a half-scaffold is
//     worse than none: the candidate would rehearse into a shape that isn't there)
//   - a conceptual question WITH STAR hints → coerced to null (dropping a
//     scaffold is safe; keeping one implies a story the gap never evidenced)
// Displayed-question grounding is therefore 100% by construction; the model's
// pre-guard rate is what the eval measures.
//
// The prompt, the payload and those guards live in ./shared, because the Agnes
// transport (./chat-adapter) must run the identical ones — see that file.
import { zodTextFormat } from "openai/helpers/zod";
import type { Gap, SessionPlan } from "../schemas";
import { PlanWire } from "./wire";
import { buildPlanRequest, finalizePlan, PLAN_SYSTEM_PROMPT, type PlanOptions } from "./shared";
import { DEFAULT_MODEL } from "../parsers";

export { PlanWire } from "./wire";
export {
  DEFAULT_MAX_QUESTIONS,
  PlanError,
  PLAN_SYSTEM_PROMPT,
  type PlanOptions,
} from "./shared";
export { compileSessionPlanViaChat } from "./chat-adapter";

/**
 * Compile the interview a candidate is likely to face from their measured gaps.
 * `gaps` must come from diffGaps — they carry the receipts the plan inherits.
 *
 * This is the OpenAI path: strict structured outputs via `responses.parse`.
 * Agnes cannot serve it (its /responses endpoint ignores json_schema) — use
 * `compileSessionPlanViaChat` for that provider.
 */
export async function compileSessionPlan(
  gaps: Gap[],
  jdText: string,
  resumeText: string,
  opts: PlanOptions,
): Promise<SessionPlan> {
  const { maxQuestions, userContent } = buildPlanRequest(gaps, opts);

  const response = await opts.client.responses.parse({
    model: opts.model ?? DEFAULT_MODEL,
    input: [
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    text: { format: zodTextFormat(PlanWire, "session_plan") },
    ...opts.requestOverrides,
  });

  return finalizePlan(response.output_parsed, {
    gaps,
    jdText,
    resumeText,
    maxQuestions,
    onWire: opts.onWire,
  });
}

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
import { zodTextFormat } from "openai/helpers/zod";
import type OpenAI from "openai";
import type { Gap, InterviewQuestion, SessionPlan } from "../schemas";
import { PlanWire } from "./wire";
import { DEFAULT_MODEL } from "../parsers";

export { PlanWire } from "./wire";

export const DEFAULT_MAX_QUESTIONS = 6;

export interface PlanOptions {
  client: OpenAI;
  /** Compile model (stack lock: gpt-5-mini). */
  model?: string;
  /** Hard cap on questions in the compiled plan. */
  maxQuestions?: number;
}

/** Raised on refusals, empty plans, or ungrounded questions. */
export class PlanError extends Error {}

const PLAN_SYSTEM_PROMPT = [
  "You compile a mock-interview question set from measured gaps between a job description and a candidate's resume.",
  "Each gap is already evidenced: it cites the JD line that demands something and the resume line (if any) that speaks to it.",
  "Emit one question per gap you choose to cover, in the order the gaps are given. Echo that gap's id in `gapId` — never invent an id.",
  "Question policy, by gap kind:",
  '- "missing_skill": the resume shows no evidence, so there is no story to tell. Emit kind "conceptual" — probe understanding and approach. starHints MUST be null.',
  '- "weak_evidence": the resume touches the requirement but shallowly. Emit kind "behavioral" — ask for the lived specifics. starHints MUST be filled in.',
  '- "strong_differentiator": usually skip; cover at most ONE, as a behavioral question that lets the candidate show depth.',
  "starHints are one-line prompts telling the candidate what each STAR beat should contain — never a scripted answer, never invented facts about them.",
  "Ask what a real interviewer would ask: one question, plainly worded, no preamble and no multi-part compound questions.",
  "rationale: one sentence naming what this gap makes worth probing.",
].join("\n");

/**
 * Compile the interview a candidate is likely to face from their measured gaps.
 * `gaps` must come from diffGaps — they carry the receipts the plan inherits.
 */
export async function compileSessionPlan(
  gaps: Gap[],
  jdText: string,
  resumeText: string,
  opts: PlanOptions,
): Promise<SessionPlan> {
  if (gaps.length === 0) {
    throw new PlanError(
      "Cannot compile a session plan from zero gaps — there is nothing to ground questions in",
    );
  }
  const maxQuestions = opts.maxQuestions ?? DEFAULT_MAX_QUESTIONS;

  const payload = {
    maxQuestions,
    gaps: gaps.map((g) => ({
      id: g.id,
      kind: g.kind,
      jdQuote: g.jdSpan.text,
      resumeQuote: g.resumeSpan?.text ?? null,
      rationale: g.rationale,
    })),
  };
  const response = await opts.client.responses.parse({
    model: opts.model ?? DEFAULT_MODEL,
    input: [
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
    ],
    text: { format: zodTextFormat(PlanWire, "session_plan") },
  });
  const wire = response.output_parsed;
  if (!wire) {
    throw new PlanError(
      "Plan compile returned no structured output (refusal or empty response)",
    );
  }
  if (wire.questions.length === 0) {
    throw new PlanError("Plan compile returned zero questions");
  }

  // Cap first, then guard: questions beyond the cap are never displayed, so
  // holding them to the grounding bar would fail a compile over output we
  // already discarded. Everything that ships is guarded.
  const gapIds = new Set(gaps.map((g) => g.id));
  const questions: InterviewQuestion[] = [];
  for (const q of wire.questions.slice(0, maxQuestions)) {
    if (!gapIds.has(q.gapId)) {
      throw new PlanError(
        `Question cites ${q.gapId}, which is not a compiled gap — a question without a receipt is not shippable`,
      );
    }
    if (q.kind === "behavioral" && q.starHints === null) {
      throw new PlanError(
        `Behavioral question for ${q.gapId} arrived without STAR hints`,
      );
    }
    questions.push({
      id: `q-${questions.length + 1}`,
      kind: q.kind,
      gapId: q.gapId,
      question: q.question,
      // Conceptual questions scaffold nothing — drop any hints rather than
      // implying a story the gap never evidenced.
      starHints: q.kind === "behavioral" ? q.starHints : null,
      rationale: q.rationale,
    });
  }

  return {
    id: `plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    jdText,
    resumeText,
    gaps,
    questions,
  };
}

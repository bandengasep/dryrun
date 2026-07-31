// Shared plan-compile machinery: the prompt, the request payload, and the
// grounding guards. Both transports — `compileSessionPlan` (OpenAI strict SO via
// responses.parse) and `compileSessionPlanViaChat` (chat.completions +
// response_format json_schema, the shape Agnes honors) — are built out of
// exactly these pieces, so switching provider can never change what is asked of
// the model or what is allowed to ship. Only the wire call differs.
import type OpenAI from "openai";
import type { Gap, InterviewQuestion, SessionPlan } from "../schemas";
import type { PlanWire } from "./wire";

export const DEFAULT_MAX_QUESTIONS = 6;

export interface PlanOptions {
  client: OpenAI;
  /** Compile model (stack lock: gpt-5-mini on OpenAI, agnes-2.0-flash on Agnes). */
  model?: string;
  /** Hard cap on questions in the compiled plan. */
  maxQuestions?: number;
  /**
   * Called with the parsed wire object BEFORE the grounding/STAR guards run.
   * Eval-only hook for measuring the model's pre-guard rates (the displayed
   * rate is 100% by construction, so it isn't the interesting number) —
   * never set by product code.
   */
  onWire?: (wire: unknown) => void;
  /**
   * Spread LAST into the request params (e.g. `{ reasoning: { effort: "low" } }`
   * on the responses path). Eval-only lever for the latency-vs-quality tradeoff
   * on the receipts-critical plan-compile stage — never set by product code.
   */
  requestOverrides?: Record<string, unknown>;
}

/** Raised on refusals, empty plans, or ungrounded questions. */
export class PlanError extends Error {}

/**
 * Exported for Langfuse prompt registration (scripts/langfuse-push-prompts.ts
 * in web/) only — a copy for reference/diffing in the Langfuse UI. Nothing in
 * the runtime path fetches a prompt back from Langfuse; this constant remains
 * the single source of truth actually sent to the model, on either provider.
 */
export const PLAN_SYSTEM_PROMPT = [
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
 * Guards the inputs and builds the one user message both transports send. Gaps
 * go over the wire by id + quotes only: the spans stay here, so the model has
 * nothing to fabricate a receipt out of.
 */
export function buildPlanRequest(
  gaps: Gap[],
  opts: PlanOptions,
): { maxQuestions: number; userContent: string } {
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
  return { maxQuestions, userContent: JSON.stringify(payload) };
}

export interface FinalizePlanInput {
  gaps: Gap[];
  jdText: string;
  resumeText: string;
  maxQuestions: number;
  onWire?: (wire: unknown) => void;
}

/**
 * Turn whatever the model emitted into a shippable SessionPlan: the grounding
 * and STAR guards, the cap, the compiler-assigned `q-N` ids, and the receipts
 * inherited from the Gap objects we already hold. Every question that survives
 * this cites a gap that exists — on either provider.
 */
export function finalizePlan(
  wire: PlanWire | null | undefined,
  input: FinalizePlanInput,
): SessionPlan {
  if (!wire) {
    throw new PlanError(
      "Plan compile returned no structured output (refusal or empty response)",
    );
  }
  input.onWire?.(wire);
  if (wire.questions.length === 0) {
    throw new PlanError("Plan compile returned zero questions");
  }

  // Cap first, then guard: questions beyond the cap are never displayed, so
  // holding them to the grounding bar would fail a compile over output we
  // already discarded. Everything that ships is guarded.
  const gapIds = new Set(input.gaps.map((g) => g.id));
  const questions: InterviewQuestion[] = [];
  for (const q of wire.questions.slice(0, input.maxQuestions)) {
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
    jdText: input.jdText,
    resumeText: input.resumeText,
    gaps: input.gaps,
    questions,
  };
}

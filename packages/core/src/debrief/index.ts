// Debrief compiler. One batched strict-SO call over the questions the candidate
// actually answered, then every "covered" claim is re-anchored to the
// candidate's own words with the same span locator the parsers use.
//
// The rule that shapes this module: a claim about what someone said is only
// displayable if their words can be found. So the model emits quotes as plain
// strings, locateSpan re-finds them in the real transcript, and anything that
// fails to locate is DEMOTED to `dropped[]` — surfaced as a visible count,
// never silently discarded and never shown as if it were evidence.
//
// Absences are treated differently from presences, deliberately. `missed`
// carries no quote, because you cannot quote something that was not said — the
// same precedent as a missing_skill gap whose resume receipt is null.
import { zodTextFormat } from "openai/helpers/zod";
import type OpenAI from "openai";
import type {
  CoveragePoint,
  DebriefReport,
  DroppedQuote,
  MissedPoint,
  QuestionDebrief,
  SessionPlan,
  TranscriptTurn,
} from "../schemas";
import { locateSpan } from "../parsers/spans";
import { DEFAULT_MODEL } from "../parsers";
import { DebriefWire } from "./wire";
import { timeForSpan } from "./timeline";

export { DebriefWire } from "./wire";
export { joinTimedWords, timeForSpan, type VideoTime } from "./timeline";

/** Raised on refusals, unknown question ids, or coverage holes. */
export class DebriefError extends Error {}

/** Summary used for a question the candidate never answered. A fact, not a judgement. */
export const NOT_ATTEMPTED_SUMMARY = "This question wasn't answered.";

export interface DebriefOptions {
  client: OpenAI;
  /** Compile model (stack lock: gpt-5-mini). */
  model?: string;
  /**
   * Called with the parsed wire object BEFORE the coverage/quote guards run.
   * Eval-only hook — never set by product code.
   */
  onWire?: (wire: unknown) => void;
}

/**
 * Exported for Langfuse prompt registration (scripts/langfuse-push-prompts.ts
 * in web/) only — a copy for reference/diffing in the Langfuse UI. Nothing in
 * the runtime path fetches a prompt back from Langfuse; this constant remains
 * the single source of truth actually sent to the model below.
 */
export const DEBRIEF_SYSTEM_PROMPT = [
  "You review a candidate's answers in a practice interview.",
  "For each question, say what the answer covered and what it left out.",
  "",
  "Every entry in `covered` MUST include `quote`: an EXACT substring of that candidate's answer, copied character for character — same casing, spelling, punctuation and spacing. Never paraphrase inside `quote`, never quote the interviewer, and never quote words the candidate did not say.",
  "Prefer the shortest quote that carries the point. If you cannot find real words to quote for a point, leave the point out entirely.",
  "",
  "`missed` is for things a strong answer to this question would have included but this answer did not. Those carry no quote — they are absences.",
  "`summary` is one or two plain sentences describing the answer.",
  "",
  "Do not score, grade, rate, rank, or judge the candidate. Do not say the answer was good, bad, strong or weak. Describe what is there and what is not.",
  "Echo each questionId exactly as given.",
].join("\n");

/**
 * Compile the debrief for a finished session.
 *
 * `transcript` is the client-held record of the session; `plan` supplies the
 * questions and the receipt chain. Questions with no candidate turn are marked
 * not-attempted here and never sent to the model — there is nothing to analyse,
 * and inviting a verdict on an empty answer invites invention.
 */
export async function compileDebrief(
  plan: SessionPlan,
  transcript: TranscriptTurn[],
  opts: DebriefOptions,
): Promise<DebriefReport> {
  // Which turns belong to which question, keeping each turn's index in the full
  // transcript — that index is half of every quote's receipt.
  const answersByQuestion = new Map<string, { turn: TranscriptTurn; index: number }[]>();
  for (const [index, turn] of transcript.entries()) {
    if (turn.role !== "candidate") continue;
    if (turn.questionId === null) continue;
    if (turn.text.trim().length === 0) continue;
    const list = answersByQuestion.get(turn.questionId) ?? [];
    list.push({ turn, index });
    answersByQuestion.set(turn.questionId, list);
  }

  const answered = plan.questions.filter((q) => (answersByQuestion.get(q.id) ?? []).length > 0);

  // Nothing was answered: a complete, honest report with no model call.
  if (answered.length === 0) {
    return {
      planId: plan.id,
      perQuestion: plan.questions.map(notAttempted),
      dropped: [],
    };
  }

  const payload = {
    questions: answered.map((q) => ({
      questionId: q.id,
      question: q.question,
      kind: q.kind,
      answers: (answersByQuestion.get(q.id) ?? []).map((a) => a.turn.text),
    })),
  };

  const response = await opts.client.responses.parse({
    model: opts.model ?? DEFAULT_MODEL,
    input: [
      { role: "system", content: DEBRIEF_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
    ],
    text: { format: zodTextFormat(DebriefWire, "debrief") },
  });
  const wire = response.output_parsed;
  if (!wire) {
    throw new DebriefError(
      "Debrief returned no structured output (refusal or empty response)",
    );
  }
  opts.onWire?.(wire);

  const planQuestionIds = new Set(plan.questions.map((q) => q.id));
  const byQuestion = new Map<string, DebriefWire["questions"][number]>();
  for (const entry of wire.questions) {
    if (!planQuestionIds.has(entry.questionId)) {
      throw new DebriefError(
        `Debrief covers ${entry.questionId}, which is not a question in this plan`,
      );
    }
    byQuestion.set(entry.questionId, entry);
  }

  const dropped: DroppedQuote[] = [];
  const perQuestion: QuestionDebrief[] = [];

  for (const question of plan.questions) {
    const answers = answersByQuestion.get(question.id) ?? [];
    if (answers.length === 0) {
      perQuestion.push(notAttempted(question));
      continue;
    }

    const entry = byQuestion.get(question.id);
    if (!entry) {
      throw new DebriefError(
        `No debrief for answered question ${question.id} (coverage guard)`,
      );
    }

    // Repeated identical quotes must resolve to successive occurrences rather
    // than pointing at the same words twice. One cursor per turn does that.
    const cursors = new Map<number, number>();
    const covered: CoveragePoint[] = [];

    for (const point of entry.covered) {
      const located = locateInAnswers(answers, point.quote, cursors);
      if (!located) {
        dropped.push({
          questionId: question.id,
          claim: point.claim,
          quote: point.quote,
          reason: "quote_not_found",
        });
        continue;
      }
      covered.push({
        claim: point.claim,
        quote: {
          turnIndex: located.turnIndex,
          span: located.span,
          // Computed, never model-emitted. Null for text answers.
          videoTime: located.turn.timedWords
            ? timeForSpan(located.turn.timedWords, located.span)
            : null,
        },
      });
    }

    const missed: MissedPoint[] = entry.missed.map((m) => ({ claim: m.claim }));
    perQuestion.push({
      questionId: question.id,
      // From the plan, not the model — the receipt chain is not the model's to edit.
      gapId: question.gapId,
      summary: entry.summary,
      covered,
      missed,
      attempted: true,
    });
  }

  return { planId: plan.id, perQuestion, dropped };
}

function notAttempted(question: { id: string; gapId: string }): QuestionDebrief {
  return {
    questionId: question.id,
    gapId: question.gapId,
    summary: NOT_ATTEMPTED_SUMMARY,
    covered: [],
    missed: [],
    attempted: false,
  };
}

/**
 * Find `quote` in this question's candidate turns, resuming each turn from where
 * the last match ended so identical quotes advance instead of colliding.
 */
function locateInAnswers(
  answers: { turn: TranscriptTurn; index: number }[],
  quote: string,
  cursors: Map<number, number>,
): { turnIndex: number; turn: TranscriptTurn; span: ReturnType<typeof locateSpan> & object } | null {
  for (const answer of answers) {
    const from = cursors.get(answer.index) ?? 0;
    const span = locateSpan(answer.turn.text, quote, from);
    if (span) {
      cursors.set(answer.index, span.end);
      return { turnIndex: answer.index, turn: answer.turn, span };
    }
  }
  return null;
}

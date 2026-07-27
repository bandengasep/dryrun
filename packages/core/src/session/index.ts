// The interviewer turn: prompt and protocol. Core owns both; the web route owns
// only transport (streaming the deltas out over SSE).
//
// Two deliberate constraints shape this module:
//
// 1. It builds plain `chat.completions` messages, not Responses-API input. That
//    is the lowest common denominator both providers speak — Agnes serves the
//    interviewer lane, and its /responses endpoint ignores structured-output
//    formats (measured 27 Jul), so the conversational lane must not depend on it.
//
// 2. The MODEL DOES NOT DRIVE THE SESSION. It appends a `META:` line suggesting
//    what should happen next; the client decides, holding questionIndex and the
//    follow-up count. A model that never emits META, emits a malformed one, or
//    invents an action degrades to "ask a follow-up" — the safe direction,
//    because the client's own cap will advance the session anyway. This is why
//    the sentinel is fail-soft rather than validated-and-thrown.
import type { InterviewQuestion, Gap, SessionPlan, TranscriptTurn } from "../schemas";

/** Raised when the session state handed in is inconsistent with the plan. */
export class SessionError extends Error {}

/** Follow-ups the client allows per question before forcing an advance. */
export const MAX_FOLLOWUPS = 2;

export const TURN_ACTIONS = ["ask_followup", "advance", "wrap_up"] as const;
export type TurnAction = (typeof TURN_ACTIONS)[number];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SessionState {
  plan: SessionPlan;
  transcript: TranscriptTurn[];
  questionIndex: number;
}

const PERSONA = [
  "You are a hiring interviewer running a practice interview. You are warm, direct, and brief.",
  "Speak like a person, not a form: one or two sentences, no bullet lists, no headings, no emoji.",
  "Never grade, score, rate, or praise-inflate the candidate. Do not say how well they did — that is the debrief's job, and the debrief does not grade either.",
  "Never invent facts about the candidate. If their answer was thin, ask about the missing part instead of assuming it.",
].join("\n");

/** The receipt behind the current question, rendered as interviewer context. */
function receiptContext(question: InterviewQuestion, gap: Gap | undefined): string {
  if (!gap) return "";
  const lines = [
    `The job description asks for: "${gap.jdSpan.text}"`,
    gap.resumeSpan
      ? `Their resume says only: "${gap.resumeSpan.text}"`
      : "Their resume says nothing about this.",
    `Why it is worth probing: ${question.rationale}`,
  ];
  return lines.join("\n");
}

/**
 * Build the message list for one interviewer turn.
 *
 * The whole transcript is replayed each call because the routes are stateless —
 * the client re-sends its held state per turn, so there is no server memory to
 * consult and none to go stale.
 */
export function buildInterviewerMessages(state: SessionState): ChatMessage[] {
  const { plan, transcript, questionIndex } = state;
  const question = plan.questions[questionIndex];
  if (!question) {
    throw new SessionError(
      `questionIndex ${questionIndex} is outside a plan of ${plan.questions.length} questions`,
    );
  }
  const gap = plan.gaps.find((g) => g.id === question.gapId);
  const isLast = questionIndex === plan.questions.length - 1;

  const system = [
    PERSONA,
    "",
    `This is question ${questionIndex + 1} of ${plan.questions.length}${isLast ? " — the last question." : "."}`,
    "Ask this question, in your own words if it reads stiffly, but do not change what it is asking:",
    `"${question.question}"`,
    "",
    receiptContext(question, gap),
    "",
    `You may ask at most ${MAX_FOLLOWUPS} follow-ups on this question before moving on.`,
    "",
    "After your reply, output a final line, exactly:",
    'META: {"action": "ask_followup" | "advance" | "wrap_up"}',
    "Use ask_followup when their answer left something specific unsaid; advance when it is complete enough;",
    isLast
      ? "wrap_up when this last question is done."
      : "wrap_up only if the candidate asks to stop.",
    "The META line is protocol, not conversation — never refer to it in your reply.",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const messages: ChatMessage[] = [{ role: "system", content: system }];
  for (const t of transcript) {
    // Providers reject empty-content messages; a blank turn is dropped rather
    // than failing the whole turn.
    if (t.text.trim().length === 0) continue;
    messages.push({
      role: t.role === "interviewer" ? "assistant" : "user",
      content: t.text,
    });
  }
  return messages;
}

const META_LINE = /^META:\s*(\{.*\})\s*$/;

export interface TurnReply {
  /** What the candidate sees — the sentinel is always stripped. */
  reply: string;
  action: TurnAction;
}

/**
 * Split a completed interviewer turn into its reply and its suggested action.
 *
 * Only the LAST non-empty line is considered, so a `META:` that appears inside
 * the prose — because the candidate is discussing this very protocol, or the
 * model quoted itself — is inert and stays in the reply where it belongs.
 * Anything unparseable degrades to ask_followup with the sentinel stripped:
 * the candidate must never see wire protocol, even when it is malformed.
 */
export function splitReplyAndMeta(full: string): TurnReply {
  const lines = full.split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && lines[lastIdx].trim() === "") lastIdx--;
  if (lastIdx < 0) return { reply: "", action: "ask_followup" };

  const lastLine = lines[lastIdx].trim();
  if (!lastLine.startsWith("META:")) {
    return { reply: full.trimEnd(), action: "ask_followup" };
  }

  const reply = lines.slice(0, lastIdx).join("\n").trimEnd();
  const match = META_LINE.exec(lastLine);
  if (!match) return { reply, action: "ask_followup" };

  try {
    const parsed: unknown = JSON.parse(match[1]);
    const action = (parsed as { action?: unknown }).action;
    if (typeof action === "string" && (TURN_ACTIONS as readonly string[]).includes(action)) {
      return { reply, action: action as TurnAction };
    }
  } catch {
    // Malformed JSON — fall through to the safe default.
  }
  return { reply, action: "ask_followup" };
}

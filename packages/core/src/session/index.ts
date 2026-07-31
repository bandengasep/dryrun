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

/**
 * Appended as a `user` message when the transcript contains no candidate turn.
 *
 * Agnes rejects a messages array with no user message —
 * `400 "No user query found in messages."` — where OpenAI accepts one. The
 * first turn of every interview has an empty transcript, so without this the
 * opening question would fail over to OpenAI every single time, silently
 * costing the Agnes lane exactly the moment the demo is watching. (Measured
 * 28 Jul against the live gateway.)
 *
 * Written as bracketed stage direction, never as a first-person line, so it
 * cannot be mistaken for something the candidate said. It exists only in the
 * model's context — it is never appended to the transcript, so the debrief,
 * which quotes candidate turns verbatim, can never see it.
 */
export const KICKOFF_USER_MESSAGE = "(The candidate is ready. Ask your question.)";

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

/**
 * Exported for Langfuse prompt registration (scripts/langfuse-push-prompts.ts
 * in web/) only — a copy for reference/diffing in the Langfuse UI. This is the
 * static persona half of the interviewer's system prompt; buildInterviewerMessages
 * below appends the per-turn question/receipt context that can't be pre-registered
 * (it depends on the live gap/question), so the Langfuse copy is necessarily partial.
 * Nothing in the runtime path fetches a prompt back from Langfuse.
 */
export const PERSONA = [
  "Warm, direct interview practice partner. 1-2 sentences, no lists, no emoji.",
  "Never grade, score, or praise; the debrief handles that (and doesn't grade either).",
  "Never invent facts about the candidate; if an answer is thin, ask what's missing.",
].join("\n");

/** The receipt behind the current question, rendered as interviewer context. */
function receiptContext(question: InterviewQuestion, gap: Gap | undefined): string {
  if (!gap) return "";
  const lines = [
    `JD asks for: "${gap.jdSpan.text}"`,
    gap.resumeSpan
      ? `Resume says only: "${gap.resumeSpan.text}"`
      : "Resume says nothing about this.",
    `Why probe it: ${question.rationale}`,
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
    `Question ${questionIndex + 1} of ${plan.questions.length}${isLast ? " — the last question." : "."} Ask it, own words fine, meaning unchanged:`,
    `"${question.question}"`,
    "",
    receiptContext(question, gap),
    "",
    `Up to ${MAX_FOLLOWUPS} follow-ups, then move on. End replies with exactly:`,
    'META: {"action": "ask_followup" | "advance" | "wrap_up"}',
    `ask_followup if something's missing; advance once answered; ${isLast ? "wrap_up when done." : "wrap_up only if asked to stop."}`,
    "Never mention META aloud.",
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
  // Guarantee a user message exists — see KICKOFF_USER_MESSAGE. This is a
  // provider-compatibility floor, not a prompt choice.
  if (!messages.some((m) => m.role === "user")) {
    messages.push({ role: "user", content: KICKOFF_USER_MESSAGE });
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

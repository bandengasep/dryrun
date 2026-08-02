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
    `Up to ${MAX_FOLLOWUPS} follow-ups, then move on. End replies with a final line of exactly:`,
    'META: {"action": "ask_followup" | "advance" | "wrap_up"}',
    `ask_followup if something's missing; advance once answered; ${isLast ? "wrap_up when done." : "wrap_up only if asked to stop."}`,
    "Never mention META aloud.",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const messages: ChatMessage[] = [{ role: "system", content: system }];
  for (const t of transcript) {
    // Interviewer turns are sanitized on replay: a turn that leaked its META
    // sentinel (pre-hotfix sessions persist in sessionStorage) must not teach
    // the model, by example, to leak again. Candidate turns are never
    // rewritten — the debrief quotes them verbatim, and replay must match.
    const content =
      t.role === "interviewer" ? splitReplyAndMeta(t.text).reply : t.text;
    // Providers reject empty-content messages; a blank turn is dropped rather
    // than failing the whole turn.
    if (content.trim().length === 0) continue;
    messages.push({
      role: t.role === "interviewer" ? "assistant" : "user",
      content,
    });
  }
  // Guarantee a user message exists — see KICKOFF_USER_MESSAGE. This is a
  // provider-compatibility floor, not a prompt choice.
  if (!messages.some((m) => m.role === "user")) {
    messages.push({ role: "user", content: KICKOFF_USER_MESSAGE });
  }
  return messages;
}

// --- sentinel grammar --------------------------------------------------------
// The token as models actually emit it: bare `META:`, or the bolded
// `**META:**` / `**META**:` forms. Case-sensitive on purpose — lowercase
// "meta" is ordinary prose, and requiring the colon keeps "METAMORPHOSIS" out.
const META_TOKEN = /(?:\*\*\s*)?META\s*(?::\s*\*\*|\*\*\s*:|:)/g;
// What may trail a terminal sentinel's JSON: whitespace, closing bold, closing
// fence. Anything else is prose, and prose after the close means the META was
// mentioned, not emitted — it stays visible where it belongs.
const JUNK_TAIL = /^(?:\s|\*\*|```)*$/;
// An opening fence left dangling at the reply's tail once its sentinel is cut.
const OPEN_FENCE_TAIL = /(?:\r?\n|^)[ \t]*```[a-z]*$/i;
// The token anchored at the start of a (trimmed) line — the original contract.
const ANCHORED_TOKEN = /^(?:\*\*\s*)?META\s*(?::\s*\*\*|\*\*\s*:|:)/;

function lastToken(text: string): { start: number; end: number } | null {
  META_TOKEN.lastIndex = 0;
  let hit: RegExpExecArray | null = null;
  for (let m = META_TOKEN.exec(text); m !== null; m = META_TOKEN.exec(text)) {
    hit = m;
  }
  return hit && { start: hit.index, end: hit.index + hit[0].length };
}

/**
 * Shortest JSON.parse-able object starting at `start` (which must point at a
 * `{`): candidate slices grow through successive `}` until one parses. String-
 * safe without a hand-rolled brace scanner — a `}` inside a quoted value just
 * fails the parse and the scan extends. Payloads are a dozen tokens, so the
 * quadratic worst case never matters.
 */
function parseJsonAt(
  text: string,
  start: number,
): { value: unknown; end: number } | null {
  for (
    let close = text.indexOf("}", start);
    close !== -1;
    close = text.indexOf("}", close + 1)
  ) {
    try {
      return { value: JSON.parse(text.slice(start, close + 1)), end: close + 1 };
    } catch {
      // Not closed yet — extend to the next brace.
    }
  }
  return null;
}

function actionOf(value: unknown): TurnAction {
  const action = (value as { action?: unknown } | null)?.action;
  return typeof action === "string" &&
    (TURN_ACTIONS as readonly string[]).includes(action)
    ? (action as TurnAction)
    : "ask_followup";
}

/** The reply left of a sentinel cut, with any dangling opening fence removed. */
function replyBefore(text: string, cutStart: number): string {
  return text.slice(0, cutStart).trimEnd().replace(OPEN_FENCE_TAIL, "").trimEnd();
}

export interface TurnReply {
  /** What the candidate sees — the sentinel is always stripped. */
  reply: string;
  action: TurnAction;
}

/**
 * Split a completed interviewer turn into its reply and its suggested action.
 *
 * Two rules, tried in order:
 *
 * 1. A VERIFIED terminal sentinel strips wherever it sits — same line as the
 *    prose (the 2 Aug prod leak), own line, pretty-printed across lines,
 *    fenced, or bolded. Verified means: the last `META:` token, then one
 *    balanced JSON object, then nothing but wrapper junk to end-of-string.
 *    A META the model merely QUOTES — prose continues after the close — is
 *    untouched, which is what keeps mid-text mentions inert.
 * 2. Failing that, the original line rule: a last non-empty line that STARTS
 *    with the token is an attempted sentinel and is stripped even when its
 *    JSON is malformed or truncated. The candidate must never see wire
 *    protocol, even when it is broken wire protocol.
 *
 * Anything unparseable degrades to ask_followup — fail-soft, never thrown.
 */
export function splitReplyAndMeta(full: string): TurnReply {
  const token = lastToken(full);
  if (token) {
    const braceStart = full.indexOf("{", token.end);
    if (braceStart !== -1 && full.slice(token.end, braceStart).trim() === "") {
      const parsed = parseJsonAt(full, braceStart);
      if (parsed && JUNK_TAIL.test(full.slice(parsed.end))) {
        return {
          reply: replyBefore(full, token.start),
          action: actionOf(parsed.value),
        };
      }
    }
  }

  const lines = full.split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && lines[lastIdx].trim() === "") lastIdx--;
  if (lastIdx < 0) return { reply: "", action: "ask_followup" };
  if (!ANCHORED_TOKEN.test(lines[lastIdx].trim())) {
    return { reply: full.trimEnd(), action: "ask_followup" };
  }
  // An anchored token rule 1 could not verify: malformed or truncated JSON.
  return { reply: lines.slice(0, lastIdx).join("\n").trimEnd(), action: "ask_followup" };
}

/**
 * What the candidate may see of a still-growing stream buffer.
 *
 * The client derives the visible bubble from the raw buffer on every delta,
 * so this withholds any tail that could still resolve into the sentinel: an
 * anchored token, a token followed only by whitespace or a still-unbalanced
 * payload, or a bare boundary-anchored prefix of the token itself ("M", "ME",
 * "**MET"…). A META already followed by prose can never be stripped by the
 * final parse, so it shows live. Over-withholding is transient by
 * construction: the next delta either completes the sentinel (stripped) or
 * reveals prose (restored), and the trailing meta frame reconciles the turn
 * at stream end.
 */
export function streamingReply(buffer: string): string {
  const token = lastToken(buffer);
  if (!token) {
    return buffer.replace(/(?:^|(?<=[\s*]))\*{0,2}M(?:E(?:TA?)?)?$/, "").trimEnd();
  }

  const lineStart = buffer.lastIndexOf("\n", token.start) + 1;
  const anchored = buffer.slice(lineStart, token.start).trim() === "";

  const tail = buffer.slice(token.end);
  const braceRel = tail.indexOf("{");
  const cleanToBrace = braceRel !== -1 && tail.slice(0, braceRel).trim() === "";
  let closedThenProse = false;
  if (cleanToBrace) {
    const parsed = parseJsonAt(tail, braceRel);
    closedThenProse = parsed !== null && !JUNK_TAIL.test(tail.slice(parsed.end));
  }
  const couldBecomeTerminal =
    tail.trim() === "" || (cleanToBrace && !closedThenProse);

  if (anchored || couldBecomeTerminal) {
    return replyBefore(buffer, token.start);
  }
  return splitReplyAndMeta(buffer).reply;
}

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
// What may trail a terminal sentinel's JSON. The sentinel is the LAST thing in
// a reply, so once its JSON closes anything left is wrapper noise — a closing
// fence, closing bold, a stray period the model ended the line with. Only
// letters or digits mean the model was talking ABOUT META in prose rather than
// emitting it, and that text stays visible where it belongs.
const JUNK_TAIL = /^[^\p{L}\p{N}]*$/u;
// Decoration a model may put between the token and its payload, or around it:
// backticks (inline code), asterisks (bold), whitespace.
const WRAPPER_RUN = /^[\s`*]*$/;
// An opening fence left dangling at the reply's tail once its sentinel is cut.
const OPEN_FENCE_TAIL = /(?:\r?\n|^)[ \t]*```[a-z0-9]*$/i;
// A sentinel payload is a dozen tokens; this bounds the shortest-prefix scan so
// client-supplied transcript text (replayed through this parser) cannot make it
// quadratic. Generous enough for pretty-printed JSON carrying extra keys.
const MAX_PAYLOAD_CHARS = 512;
// The token anchored at the start of a (trimmed) line — the original contract.
const ANCHORED_TOKEN = /^(?:\*\*\s*)?META\s*(?::\s*\*\*|\*\*\s*:|:)/;

/** Every token occurrence, last first — the last one can sit inside a payload. */
function tokensRightToLeft(text: string): { start: number; end: number }[] {
  META_TOKEN.lastIndex = 0;
  const hits: { start: number; end: number }[] = [];
  for (let m = META_TOKEN.exec(text); m !== null; m = META_TOKEN.exec(text)) {
    hits.push({ start: m.index, end: m.index + m[0].length });
  }
  return hits.reverse();
}

/**
 * Shortest JSON.parse-able object starting at `start` (which must point at a
 * `{`): candidate slices grow through successive `}` until one parses. String-
 * safe without a hand-rolled brace scanner — a `}` inside a quoted value just
 * fails the parse and the scan extends. The scan window is capped at
 * MAX_PAYLOAD_CHARS because this parser also runs over client-supplied
 * transcript text, where an unclosed brace run would otherwise be quadratic.
 */
function parseJsonAt(
  text: string,
  start: number,
): { value: unknown; end: number } | null {
  const limit = Math.min(text.length, start + MAX_PAYLOAD_CHARS);
  for (
    let close = text.indexOf("}", start);
    close !== -1 && close < limit;
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
 * The governing idea: THE SENTINEL IS TERMINAL. It is the last thing in a
 * reply, so once its payload closes, whatever remains is wrapper noise — a
 * closing fence, closing bold, the period the model habitually ends a line
 * with. Letters or digits after the close are the one signal that the model
 * was talking ABOUT META in prose, and that text stays where it belongs.
 *
 * Two rules, tried in order:
 *
 * 1. A VERIFIED terminal sentinel strips wherever it sits — same line as the
 *    prose (the 2 Aug prod leak), own line, pretty-printed across lines,
 *    fenced, backticked, or bolded. Verified means: a `META:` token (tried
 *    right to left, since the last one can sit inside the payload itself),
 *    optional wrapper decoration, one balanced JSON object, then no letters
 *    or digits to end-of-string.
 * 2. Failing that, the line rule: an anchored token starting the last
 *    non-empty line, OR an anchored token whose payload was cut off mid-JSON
 *    (a stream that died, a maxDuration kill). Both are attempted sentinels
 *    and are stripped even though nothing parses. The candidate must never
 *    see wire protocol, even when it is broken wire protocol.
 *
 * Anything unparseable degrades to ask_followup — fail-soft, never thrown.
 */
export function splitReplyAndMeta(full: string): TurnReply {
  for (const token of tokensRightToLeft(full)) {
    const braceStart = full.indexOf("{", token.end);
    if (braceStart === -1 || !WRAPPER_RUN.test(full.slice(token.end, braceStart))) {
      continue;
    }
    const parsed = parseJsonAt(full, braceStart);
    if (parsed) {
      if (JUNK_TAIL.test(full.slice(parsed.end))) {
        return { reply: replyBefore(full, token.start), action: actionOf(parsed.value) };
      }
      // Prose after a payload that closed cleanly. Mid-line, that is the model
      // quoting the protocol and it stays put; at the start of a line it is a
      // sentinel the model placed early, so excise it and keep the words —
      // deleting the line would erase the question the candidate must answer.
      if (isAnchored(full, token.start)) {
        return { reply: excise(full, token.start, parsed.end), action: actionOf(parsed.value) };
      }
      continue;
    }
    // Nothing parsed. A payload fragment carrying a quote is JSON cut off
    // mid-flight (finish_reason=length, a dropped stream) — broken protocol is
    // still protocol. A brace with no quote is ordinary prose about braces.
    if (full.slice(braceStart).includes('"')) {
      return { reply: replyBefore(full, token.start), action: "ask_followup" };
    }
  }

  const lines = full.split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && lines[lastIdx].trim() === "") lastIdx--;
  if (lastIdx < 0) return { reply: "", action: "ask_followup" };
  const lastLine = lines[lastIdx].trim();
  // The line rule, kept for payloads too malformed to parse at all
  // (`META: {action: advance`). It requires a payload: a line that merely
  // OPENS with the token is someone explaining the protocol, not emitting it,
  // and deleting a whole sentence of theirs would be its own silent leak.
  if (ANCHORED_TOKEN.test(lastLine) && lastLine.includes("{")) {
    return {
      reply: replyBefore(full, full.length - lines.slice(lastIdx).join("\n").length),
      action: "ask_followup",
    };
  }
  return { reply: full.trimEnd(), action: "ask_followup" };
}

/** True when only whitespace separates the token from the start of its line. */
function isAnchored(text: string, tokenStart: number): boolean {
  return text.slice(text.lastIndexOf("\n", tokenStart) + 1, tokenStart).trim() === "";
}

/** Cut [start, end) out, closing the gap without welding two words together. */
function excise(text: string, start: number, end: number): string {
  return (text.slice(0, start) + text.slice(end).replace(/^[ \t]+/, "")).trimEnd();
}

/**
 * What the candidate may see of a still-growing stream buffer.
 *
 * The client derives the visible bubble from the raw buffer on every delta,
 * so this withholds any tail that could still resolve into the sentinel: an
 * anchored token, a token followed only by wrapper decoration or a
 * still-unbalanced payload, or a bare boundary-anchored prefix of the token
 * itself ("M", "ME", "**META**"…). A META already followed by prose can never
 * be stripped by the final parse, so it shows live.
 *
 * Over-withholding is bounded, not always single-delta: a token followed by
 * more prose is restored on the next delta, but a LINE-ANCHORED token holds
 * back everything after it until the stream ends, because that is exactly the
 * shape the final parse strips. The trailing meta frame reconciles the turn
 * either way — the cost of the safe direction is a late reveal, never a leak.
 */
export function streamingReply(buffer: string): string {
  const [token] = tokensRightToLeft(buffer);
  if (!token) {
    return buffer
      .replace(/(?:^|(?<=[\s*`]))[`*]{0,2}M(?:E(?:TA?)?)?[`*]{0,2}$/, "")
      .trimEnd();
  }

  const lineStart = buffer.lastIndexOf("\n", token.start) + 1;
  const anchored = buffer.slice(lineStart, token.start).trim() === "";

  const tail = buffer.slice(token.end);
  const braceRel = tail.indexOf("{");
  const cleanToBrace = braceRel !== -1 && WRAPPER_RUN.test(tail.slice(0, braceRel));
  let closedThenProse = false;
  if (cleanToBrace) {
    const parsed = parseJsonAt(tail, braceRel);
    closedThenProse = parsed !== null && !JUNK_TAIL.test(tail.slice(parsed.end));
  }
  const couldBecomeTerminal =
    WRAPPER_RUN.test(tail) || (cleanToBrace && !closedThenProse);

  if (anchored || couldBecomeTerminal) {
    return replyBefore(buffer, token.start);
  }
  return splitReplyAndMeta(buffer).reply;
}

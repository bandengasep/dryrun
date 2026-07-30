import { NextResponse } from "next/server";
import type OpenAI from "openai";
import {
  SessionTurnRequest,
  buildInterviewerMessages,
  splitReplyAndMeta,
} from "@dryrun/core";
import type { SSEEmit } from "../../../lib/stream";
import { sseResponse } from "../../../lib/sse-response";
import {
  makeInterviewerLane,
  makeOpenAILane,
  type InterviewerLane,
} from "../../../lib/providers";

// One conversational turn. Streaming means the ceiling only has to cover a
// single reply — the client holds the session and re-sends it per turn, so no
// request ever spans the whole interview.
export const maxDuration = 120;

/**
 * Produce the interviewer's next turn.
 *
 * SSE: `provider {name, model, failover}` → `delta {text}`… → `meta {action, reply}`
 * → `done {usage}`.
 *
 * `provider` is emitted FIRST, and only once a token has genuinely arrived, so
 * the UI can label who is answering before any text lands. The Agnes/OpenAI
 * split is disclosed, never silently swapped.
 *
 * `delta` carries RAW model output, including the trailing `META:` sentinel if
 * the model emits it mid-flight. The client must render
 * `splitReplyAndMeta(accumulated).reply` rather than naively appending — and
 * `meta.reply` carries the final cleaned text so the client can reconcile at the
 * end regardless. Deltas are not filtered server-side because an interviewer
 * reply is often a single line: withholding the last line until the stream ends
 * would mean nothing streams at all.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = SessionTurnRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Malformed session state: ${parsed.error.issues[0]?.message ?? "unknown"}`,
      },
      { status: 400 },
    );
  }
  const { plan, transcript, questionIndex } = parsed.data;
  if (questionIndex >= plan.questions.length) {
    return NextResponse.json(
      {
        error: `questionIndex ${questionIndex} is past the end of a ${plan.questions.length}-question plan.`,
      },
      { status: 400 },
    );
  }

  // Built before the stream opens: a bad index should be an HTTP 400, not an
  // error event the client has to unpack.
  const messages = buildInterviewerMessages({ plan, transcript, questionIndex });
  const langfuseOpts = {
    route: "session-turn",
    metadata: { questionIndex, transcriptTurns: transcript.length },
  };

  return sseResponse(async (emit) => {
    const primary = makeInterviewerLane(langfuseOpts);
    let full: string;

    try {
      full = await streamTurn(primary, messages, emit, false);
    } catch (primaryError) {
      // streamTurn emits nothing until its first token, so if it threw before
      // that the wire is still clean and the failover lane can claim it. Once
      // tokens are out, retrying would duplicate half a sentence — so a
      // mid-stream failure rethrows and surfaces as an `error` event.
      if (primary.provider !== "agnes") throw primaryError;
      full = await streamTurn(makeOpenAILane(langfuseOpts), messages, emit, true);
    }

    // The model SUGGESTS what happens next; the client decides and enforces the
    // 2-follow-up cap. Absent or malformed sentinels degrade to ask_followup.
    const { reply, action } = splitReplyAndMeta(full);
    emit("meta", { action, reply });
    emit("done", {});
  });
}

/**
 * Stream one lane's reply, returning the raw accumulated text.
 *
 * Emits `provider` only once the first content token has actually arrived —
 * that is what makes "failover is clean before the first byte" true rather than
 * merely intended.
 */
async function streamTurn(
  lane: InterviewerLane,
  messages: { role: string; content: string }[],
  emit: SSEEmit,
  isFailover: boolean,
): Promise<string> {
  const stream = await lane.client.chat.completions.create({
    model: lane.model,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    stream: true,
    stream_options: { include_usage: true },
    ...lane.params,
  });

  let full = "";
  let started = false;
  let usage: unknown = null;

  for await (const chunk of stream) {
    // Usage arrives on a final usage-only chunk under include_usage — verified
    // on both providers 27 Jul — so it is read off every chunk, not the last
    // content one.
    if (chunk.usage) usage = chunk.usage;

    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;

    if (!started) {
      emit("provider", {
        name: lane.provider,
        model: lane.model,
        failover: isFailover,
      });
      started = true;
    }
    full += delta;
    emit("delta", { text: delta });
  }

  if (!started) {
    // No content at all. Thrown rather than returned so the caller can fail
    // over instead of handing the candidate an empty interviewer turn.
    throw new Error(`${lane.provider} (${lane.model}) returned an empty reply`);
  }

  emit("usage", { provider: lane.provider, model: lane.model, usage });
  return full;
}

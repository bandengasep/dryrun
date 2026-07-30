// Provider wiring. Every lane is an `OpenAI` client — Agnes is OpenAI-compatible,
// so it arrives through the same client-injection seam core already takes
// (`new OpenAI({ baseURL, apiKey })`) with no adapter and no second SDK.
//
// Which provider does what, and why (measured 27 Jul — see decision log):
//
//   receipts-critical structured calls (parse / diff / plan / debrief)
//     → OpenAI, strict structured outputs via responses.parse.
//       Agnes CANNOT serve this lane: its /v1/responses endpoint returns 200 but
//       silently ignores `text.format` json_schema and answers in prose, which
//       makes responses.parse throw on the JSON.parse. Agnes structured calls
//       (Thursday's provider-comparison eval) must go through chat.completions
//       + response_format instead.
//
//   the conversational interviewer turn
//     → Agnes agnes-2.0-flash over chat.completions streaming, because that is
//       the lowest common denominator both providers speak, and because it is
//       measurably faster to first token: 1235ms vs gpt-5-mini's 4371ms, against
//       a locked <=3s budget.
//
// Clients are constructed per request so `next build` never needs a key.
import OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";
import { langfuseEnabled } from "./langfuse";

export type InterviewerProvider = "agnes" | "openai";

/** Optional Langfuse context a caller may attach when constructing a lane. */
export interface LangfuseTraceOptions {
  /** Route name, e.g. "compile", "plan", "debrief", "session-turn" — becomes a tag. */
  route?: string;
  /** Cheap extra context (pair/stage counts, char lengths) — never raw JD/resume/transcript text. */
  metadata?: Record<string, unknown>;
}

/**
 * Wrap a client with Langfuse's OpenAI observer when Langfuse is configured;
 * otherwise return the client unchanged. `generationName` identifies the lane
 * ("structured" | "interviewer-agnes" | "interviewer-openai-failover") so
 * traces are filterable by which lane produced them without opening each one.
 */
function withLangfuseObservability(
  client: OpenAI,
  generationName: string,
  opts: LangfuseTraceOptions = {},
): OpenAI {
  if (!langfuseEnabled()) return client;
  const tags = [`lane:${generationName}`, ...(opts.route ? [`route:${opts.route}`] : [])];
  return observeOpenAI(client, {
    generationName,
    tags,
    generationMetadata: { lane: generationName, route: opts.route, ...opts.metadata },
  });
}

export const AGNES_BASE_URL_DEFAULT = "https://apihub.agnes-ai.com/v1";
export const AGNES_MODEL_DEFAULT = "agnes-2.0-flash";
export const OPENAI_MODEL_DEFAULT = "gpt-5-mini";

export interface InterviewerLane {
  provider: InterviewerProvider;
  client: OpenAI;
  model: string;
  /**
   * Extra params this lane needs on chat.completions to hit the latency budget.
   * OpenAI's gpt-5-mini spends 256 reasoning tokens before its first visible
   * token by default (4371ms measured), which blows the <=3s first-turn-token
   * criterion; `reasoning_effort: "minimal"` brings it to 1158ms with 0 reasoning
   * tokens. Agnes needs nothing here.
   */
  params: Record<string, unknown>;
}

/**
 * The receipts-critical lane: OpenAI, strict structured outputs.
 * Never Agnes — see the note at the top of this file.
 */
export function makeStructuredClient(opts: LangfuseTraceOptions = {}): OpenAI {
  return withLangfuseObservability(new OpenAI(), "structured", opts);
}

/** The OpenAI interviewer lane — the default's failover, and usable directly. */
export function makeOpenAILane(opts: LangfuseTraceOptions = {}): InterviewerLane {
  return {
    provider: "openai",
    client: withLangfuseObservability(new OpenAI(), "interviewer-openai-failover", opts),
    model: process.env.OPENAI_INTERVIEWER_MODEL ?? OPENAI_MODEL_DEFAULT,
    params: { reasoning_effort: "minimal" },
  };
}

/** The Agnes interviewer lane. */
export function makeAgnesLane(opts: LangfuseTraceOptions = {}): InterviewerLane {
  const client = new OpenAI({
    apiKey: process.env.AGNES_API_KEY,
    baseURL: process.env.AGNES_BASE_URL ?? AGNES_BASE_URL_DEFAULT,
  });
  return {
    provider: "agnes",
    client: withLangfuseObservability(client, "interviewer-agnes", opts),
    model: process.env.AGNES_MODEL ?? AGNES_MODEL_DEFAULT,
    params: {},
  };
}

/**
 * The interviewer lane to try first. Defaults to Agnes; `INTERVIEWER_PROVIDER`
 * overrides. Falls back to OpenAI when Agnes has no key configured, so a missing
 * key degrades to a working demo rather than a failed turn — the UI labels
 * whichever provider actually answered.
 */
export function makeInterviewerLane(opts: LangfuseTraceOptions = {}): InterviewerLane {
  const requested = (process.env.INTERVIEWER_PROVIDER ??
    "agnes") as InterviewerProvider;
  if (requested === "openai") return makeOpenAILane(opts);
  if (!process.env.AGNES_API_KEY) return makeOpenAILane(opts);
  return makeAgnesLane(opts);
}

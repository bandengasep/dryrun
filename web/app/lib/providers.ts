// Provider wiring. Every lane is an `OpenAI` client — Agnes is OpenAI-compatible,
// so it arrives through the same client-injection seam core already takes
// (`new OpenAI({ baseURL, apiKey })`) with no adapter and no second SDK.
//
// Which provider does what, and why (measured 27 Jul — see decision log):
//
//   receipts-critical structured calls (parse / diff / plan / debrief)
//     → OpenAI, strict structured outputs via responses.parse.
//       Agnes cannot serve this lane THAT WAY: its /v1/responses endpoint returns
//       200 but silently ignores `text.format` json_schema and answers in prose,
//       which makes responses.parse throw on the JSON.parse. Agnes structured
//       calls must go through chat.completions + response_format instead — the
//       shape Thursday's provider-comparison eval measured, now in core as
//       compileSessionPlanViaChat and reachable from the plan lane below.
//
//   the plan compile, optionally (PLAN_PROVIDER=agnes, default openai)
//     → Agnes agnes-2.0-flash over chat.completions + json_schema, with per-request
//       failover to the OpenAI path. Measured 28 Jul at receipts parity (grounding
//       12/12, STAR 100% on both) and 13.2s vs 31.6s mean — a latency lever, not a
//       quality one. Guards are identical either way, so the receipts chain does
//       not depend on who answered; the response says who did.
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

/** Which provider serves the plan compile. Same two names, a separate switch. */
export type PlanProvider = "agnes" | "openai";

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

/** Ceiling on one Agnes plan attempt, leaving the OpenAI failover room to finish. */
export const AGNES_PLAN_TIMEOUT_MS = 45_000;

/** An Agnes client + model for a structured (non-conversational) call. */
export interface AgnesStructuredLane {
  client: OpenAI;
  model: string;
}

/**
 * The Agnes plan lane: the same client construction as makeAgnesLane, pointed at
 * core's chat.completions plan adapter instead of the interviewer turn. Kept a
 * separate constructor so the two lanes trace apart in Langfuse ("plan-agnes" vs
 * "interviewer-agnes") — the comparison exhibit needs them distinguishable.
 */
export function makeAgnesPlanLane(opts: LangfuseTraceOptions = {}): AgnesStructuredLane {
  const client = new OpenAI({
    apiKey: process.env.AGNES_API_KEY,
    baseURL: process.env.AGNES_BASE_URL ?? AGNES_BASE_URL_DEFAULT,
    // The route's failover has to fit inside the same maxDuration as the plain
    // OpenAI path, so a hung Agnes must not eat the whole budget: cap the attempt
    // at ~3x its measured 13.2s mean and don't retry in place — the failover IS
    // the retry, and it goes to the provider with the longer track record.
    timeout: AGNES_PLAN_TIMEOUT_MS,
    maxRetries: 0,
  });
  return {
    client: withLangfuseObservability(client, "plan-agnes", opts),
    model: process.env.AGNES_MODEL ?? AGNES_MODEL_DEFAULT,
  };
}

/**
 * Which provider the plan compile tries FIRST. Defaults to "openai" — today's
 * exact behavior — so the seam ships dark; flipping `PLAN_PROVIDER=agnes` is a
 * separate, gated decision. A missing Agnes key resolves back to OpenAI rather
 * than failing a request the failover would have rescued anyway.
 */
export function planProvider(): PlanProvider {
  if (process.env.PLAN_PROVIDER !== "agnes") return "openai";
  return process.env.AGNES_API_KEY ? "agnes" : "openai";
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

/**
 * The structured lane's model, when adopted away from core's default.
 * `OPENAI_STRUCTURED_MODEL=gpt-5.6-luna` was adopted 31 Jul through the locked
 * mechanical gates — consistency Jaccard 0.881/0.770 (target ≥0.6), pre-guard
 * grounding 30/30, STAR 100% (`evals/results/*-gpt-5.6-luna-2026-07-31.json`)
 * — at 3–5× the serving speed of the gpt-5-mini baseline. Unset = core's
 * default model: the same unset-and-redeploy kill switch as the mic rung.
 */
export function structuredModel(): string | undefined {
  return process.env.OPENAI_STRUCTURED_MODEL || undefined;
}

/**
 * `requestOverrides` for the receipts-critical structured lane, populated from
 * `OPENAI_STRUCTURED_MODEL` (the gate-adopted model above) and
 * `OPENAI_SERVICE_TIER`. `service_tier` is a serving-speed knob, not a quality
 * one — same model, same outputs, only how fast OpenAI's infra schedules the
 * request (`"priority"` faster / costs more, `"flex"` slower / costs less);
 * unlike `reasoning.effort` it never changes what the model returns, so
 * product code (not just evals) may set it behind this env flag. Measured, not
 * promised: OpenAI echoes the tier actually served back in the response body,
 * which Langfuse's observeOpenAI wrapper captures — that echo is the receipt,
 * not this flag's presence. Returns `{}` (spread is a no-op) when neither env
 * var is set to a supported value.
 */
export function structuredRequestOverrides(): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};
  const model = structuredModel();
  if (model) overrides.model = model;
  const tier = process.env.OPENAI_SERVICE_TIER;
  if (tier === "priority" || tier === "flex") overrides.service_tier = tier;
  return overrides;
}

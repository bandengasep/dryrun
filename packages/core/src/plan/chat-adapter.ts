// The chat.completions transport for the plan compile — same prompt, same wire
// schema, same guards as ./index, different wire call.
//
// Why it exists: verified 2026-07-27 (docs/decision-log.md), Agnes's
// `/v1/responses` endpoint SILENTLY IGNORES `text.format` json_schema — it
// returns HTTP 200 with free prose instead of the schema-conforming JSON
// `responses.parse` expects, which then fails client-side on the JSON parse.
// The path Agnes DOES honor — measured, schema-conforming JSON round-tripped
// through Zod — is `chat.completions.create` with
// `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`,
// where `schema` comes from `z.toJSONSchema(PlanWire, { io: "output" })`. This
// file is the eval suite's proven adapter (test/evals/agnes-adapter.ts), moved
// into the library and wired to the real compiler so the product can serve the
// plan lane from Agnes rather than only measure it.
//
// Receipts are unaffected: `strict: true` on the JSON Schema side is the
// provider's guarantee, the Zod re-validation below is ours, and finalizePlan
// runs the identical grounding/STAR guards either way. A question can only ship
// if it cites a gap we compiled, whoever wrote it.
import { z } from "zod";
import type { Gap, SessionPlan } from "../schemas";
import { PlanWire } from "./wire";
import { buildPlanRequest, finalizePlan, PLAN_SYSTEM_PROMPT, type PlanOptions } from "./shared";
import { DEFAULT_MODEL } from "../parsers";

/** Response-format schema name (a-z, A-Z, 0-9, underscores/dashes, <=64 chars). */
const SCHEMA_NAME = "session_plan";

/**
 * Compile the interview a candidate is likely to face, over chat.completions +
 * response_format json_schema. Behaviourally identical to `compileSessionPlan`
 * — the returned SessionPlan is the same shape, from the same guards — so the
 * two are interchangeable behind a provider switch.
 *
 * `opts.model` should name the provider's model (e.g. `agnes-2.0-flash`); it
 * falls back to the OpenAI default only so the two entry points stay symmetric.
 * A malformed provider response throws a plain Error carrying the raw content,
 * not a PlanError: nothing was grounded or refused, the transport just failed,
 * and the caller's failover should read that difference from the error type.
 */
export async function compileSessionPlanViaChat(
  gaps: Gap[],
  jdText: string,
  resumeText: string,
  opts: PlanOptions,
): Promise<SessionPlan> {
  const { maxQuestions, userContent } = buildPlanRequest(gaps, opts);

  const response = await opts.client.chat.completions.create({
    model: opts.model ?? DEFAULT_MODEL,
    messages: [
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: SCHEMA_NAME,
        strict: true,
        schema: z.toJSONSchema(PlanWire, { io: "output" }) as Record<string, unknown>,
      },
    },
    ...opts.requestOverrides,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`Plan compile over chat.completions returned no content`);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error(
      `Plan compile over chat.completions returned non-JSON content:\n${content}`,
    );
  }

  // Re-validate with the SAME wire schema the strict-SO path validates against:
  // `strict: true` is a promise, this is the check.
  const result = PlanWire.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(
      `Plan compile over chat.completions returned schema-invalid JSON:\n${content}\n\n${result.error.message}`,
    );
  }

  return finalizePlan(result.data, {
    gaps,
    jdText,
    resumeText,
    maxQuestions,
    onWire: opts.onWire,
  });
}

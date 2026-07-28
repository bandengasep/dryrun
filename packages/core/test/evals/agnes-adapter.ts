// Agnes structured-output adapter for the eval suite.
//
// Verified 2026-07-27 (docs/decision-log.md): Agnes's `/v1/responses` endpoint
// SILENTLY IGNORES `text.format` json_schema — it returns HTTP 200 with free
// prose instead of the schema-conforming JSON `responses.parse` expects, which
// then fails client-side with a JSON parse error. `responses.parse` (the path
// every core module uses for OpenAI) is therefore NOT usable against Agnes.
// The path that IS honored — measured, schema-conforming JSON round-tripped
// through Zod — is `chat.completions.create` with
// `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`,
// where `schema` comes from `z.toJSONSchema(Wire, { io: "output" })`. This
// file is that adapter, scoped to the eval suite (the interviewer lane was
// already on chat.completions and is unaffected).
import OpenAI from "openai";
import { z, type ZodType } from "zod";

const DEFAULT_AGNES_BASE_URL = "https://apihub.agnes-ai.com/v1";

/** Builds an OpenAI-client pointed at Agnes, from AGNES_API_KEY / AGNES_BASE_URL. */
export function makeAgnesEvalClient(): OpenAI {
  const apiKey = process.env.AGNES_API_KEY;
  if (!apiKey) {
    throw new Error("AGNES_API_KEY is not set — required for the Agnes eval lane");
  }
  const baseURL = process.env.AGNES_BASE_URL ?? DEFAULT_AGNES_BASE_URL;
  return new OpenAI({ apiKey, baseURL });
}

export interface AgnesStructuredOptions<T> {
  model: string;
  system: string;
  user: string;
  /** The same wire Zod schema the OpenAI strict-SO path validates against. */
  wire: ZodType<T>;
  /** Response-format schema name (a-z, A-Z, 0-9, underscores/dashes, <=64 chars). */
  name: string;
}

/**
 * Runs one structured call against Agnes and re-validates the result with the
 * SAME wire schema the OpenAI path uses — `strict: true` on the JSON Schema
 * side is Agnes's guarantee, Zod re-validation is ours. Throws with the raw
 * content on any failure (non-JSON, or JSON that fails Zod) so a broken run
 * is diagnosable from the error message alone.
 */
export async function agnesStructured<T>(
  client: OpenAI,
  opts: AgnesStructuredOptions<T>,
): Promise<T> {
  const schema = z.toJSONSchema(opts.wire, { io: "output" });
  const response = await client.chat.completions.create({
    model: opts.model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: opts.name,
        strict: true,
        schema: schema as unknown as Record<string, unknown>,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`Agnes structured call "${opts.name}" returned no content`);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error(
      `Agnes structured call "${opts.name}" returned non-JSON content:\n${content}`,
    );
  }

  const result = opts.wire.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(
      `Agnes structured call "${opts.name}" returned schema-invalid JSON:\n${content}\n\n${result.error.message}`,
    );
  }
  return result.data;
}

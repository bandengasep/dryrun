// Shared masking rule for Langfuse trace IO — see AGENTS.md rule 6 ("PII
// masking (product stance, non-negotiable)"): production traces must NOT
// carry raw JD/resume/transcript text. Any string longer than the threshold
// gets redacted to a length-only placeholder, so the trace still shows shape
// (how much text moved) without shipping its content off-repo.
//
// Structural, not a single blob regex: the mask hook receives the whole
// input/output/metadata value as a JSON string, so this walks the parsed
// value and redacts leaf strings individually — a { jdText, resumeText }
// object gets both fields masked independently, not the object's stringified
// form nuked wholesale.
//
// LANGFUSE_TRACE_FULL_IO=1 disables masking entirely. The eval harness
// (packages/core/test/evals/harness.ts) sets this for its own separate OTEL
// registration — fixture pairs are Timothy's own resume plus public job
// postings, not user PII, so there is nothing to protect there and masked
// eval traces would just be useless for debugging model output.
const MASK_THRESHOLD = 200;

function maskValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > MASK_THRESHOLD ? `[masked: ${value.length} chars]` : value;
  }
  if (Array.isArray(value)) return value.map(maskValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, maskValue(v)]),
    );
  }
  return value;
}

/**
 * `LangfuseSpanProcessor({ mask })` hook (JS/TS SDK): receives `{ data }`
 * where `data` is the JSON-stringified attribute value (input/output/metadata
 * of an observation), returns the replacement — also stringified.
 */
export function maskForLangfuse({ data }: { data: string }): string {
  if (process.env.LANGFUSE_TRACE_FULL_IO === "1") return data;
  try {
    const parsed: unknown = JSON.parse(data);
    return JSON.stringify(maskValue(parsed));
  } catch {
    // Not JSON — a bare string attribute. Apply the same length rule directly.
    return data.length > MASK_THRESHOLD ? `[masked: ${data.length} chars]` : data;
  }
}

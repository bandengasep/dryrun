// Gap diff engine. Embedding match (in-memory cosine at fixture scale;
// pgvector persistence comes later) narrows each JD requirement to its top-k
// nearest resume lines; one batched strict-SO adjudication call classifies
// each requirement as missing_skill / weak_evidence / strong_differentiator.
// Receipts are attached from the parsed lines' precomputed spans — the model
// cites line ids only and can never fabricate a span. Citation guards:
// weak/strong verdicts MUST cite a real resume line (else DiffError);
// missing_skill citations are coerced to null (dropping a citation never
// fabricates evidence).
import { zodTextFormat } from "openai/helpers/zod";
import type OpenAI from "openai";
import type { Gap, ParsedJD, ParsedResume, ResumeLine } from "../schemas";
import { DiffWire } from "./wire";
import { DEFAULT_MODEL } from "../parsers";

export { DiffWire } from "./wire";

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_TOP_K = 3;

export interface DiffOptions {
  client: OpenAI;
  /** Adjudication model (stack lock: gpt-5-mini). */
  model?: string;
  /** Embedding model (stack lock: text-embedding-3-small). */
  embeddingModel?: string;
  /** Candidate resume lines shown to the adjudicator per requirement. */
  topK?: number;
  /**
   * Spread LAST into the responses.parse request params (e.g.
   * `{ reasoning: { effort: "low" } }`). Eval-only lever for the
   * latency-vs-quality tradeoff on the receipts-critical adjudication stage —
   * never set by product code.
   */
  requestOverrides?: Record<string, unknown>;
}

/** Raised on refusals, coverage holes, or fabricated citations. */
export class DiffError extends Error {}

/**
 * Indices of the top-k candidates by cosine similarity, descending.
 * Zero-magnitude vectors score 0 rather than NaN. Ties break by lower index.
 */
export function cosineTopK(
  query: number[],
  candidates: number[][],
  k: number,
): number[] {
  const qNorm = Math.hypot(...query);
  const scored = candidates.map((vec, index) => {
    const vNorm = Math.hypot(...vec);
    if (qNorm === 0 || vNorm === 0) return { index, sim: 0 };
    let dot = 0;
    for (let i = 0; i < query.length; i++) dot += query[i] * (vec[i] ?? 0);
    return { index, sim: dot / (qNorm * vNorm) };
  });
  scored.sort((a, b) => b.sim - a.sim || a.index - b.index);
  // Clamp below as well: slice(0, negative) would drop from the END, quietly
  // returning almost-all candidates for k <= 0 instead of none.
  const take = Math.max(0, Math.min(k, candidates.length));
  return scored.slice(0, take).map((s) => s.index);
}

const ADJUDICATOR_SYSTEM_PROMPT = [
  "You adjudicate whether a resume evidences each job-description requirement.",
  "For every requirement in the payload emit exactly one verdict:",
  '- "missing_skill": no candidate line speaks to the requirement. resumeLineId MUST be null.',
  '- "weak_evidence": a candidate line touches the requirement but is shallow, unquantified, or partial. Cite that line\'s id.',
  '- "strong_differentiator": a candidate line meets or exceeds the requirement with concrete evidence. Cite that line\'s id.',
  "Rules: resumeLineId must be one of THAT requirement's candidate ids (or null). Echo requirementId exactly.",
  "Judge only from the provided lines — never invent evidence. rationale: one sentence naming the deciding evidence or its absence.",
].join("\n");

export async function diffGaps(
  jd: ParsedJD,
  resume: ParsedResume,
  opts: DiffOptions,
): Promise<Gap[]> {
  if (jd.lines.length === 0) return [];

  const topK = opts.topK ?? DEFAULT_TOP_K;
  const lineById = new Map<string, ResumeLine>(
    resume.lines.map((l) => [l.id, l]),
  );

  // Stage 1 — retrieval: one embeddings call for [requirements..., lines...].
  let candidateIds: string[][];
  if (resume.lines.length === 0) {
    candidateIds = jd.lines.map(() => []);
  } else {
    const inputs = [
      ...jd.lines.map((l) => l.text),
      ...resume.lines.map((l) => l.text),
    ];
    const embedded = await opts.client.embeddings.create({
      model: opts.embeddingModel ?? DEFAULT_EMBEDDING_MODEL,
      input: inputs,
    });
    // data[].index is the contract; array order is not.
    const vectors = [...embedded.data]
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
    const reqVecs = vectors.slice(0, jd.lines.length);
    const lineVecs = vectors.slice(jd.lines.length);
    candidateIds = reqVecs.map((rv) =>
      cosineTopK(rv, lineVecs, topK).map((i) => resume.lines[i].id),
    );
  }

  // Stage 2 — one batched adjudication call over all requirements.
  const payload = {
    requirements: jd.lines.map((req, i) => ({
      id: req.id,
      requirement: req.text,
      quote: req.span.text,
      candidates: candidateIds[i].map((id) => {
        const line = lineById.get(id)!;
        return { id, text: line.text };
      }),
    })),
  };
  const response = await opts.client.responses.parse({
    model: opts.model ?? DEFAULT_MODEL,
    input: [
      { role: "system", content: ADJUDICATOR_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
    ],
    text: { format: zodTextFormat(DiffWire, "gap_verdicts") },
    ...opts.requestOverrides,
  });
  const wire = response.output_parsed;
  if (!wire) {
    throw new DiffError(
      "Adjudication returned no structured output (refusal or empty response)",
    );
  }

  // Stage 3 — verdicts → Gaps with receipts from the parsed lines' spans.
  const verdictByReq = new Map(wire.verdicts.map((v) => [v.requirementId, v]));
  const gaps: Gap[] = [];
  for (const [i, req] of jd.lines.entries()) {
    const verdict = verdictByReq.get(req.id);
    if (!verdict) {
      throw new DiffError(`No verdict for requirement ${req.id} (coverage guard)`);
    }
    let resumeLine: ResumeLine | null = null;
    if (verdict.kind === "missing_skill") {
      resumeLine = null; // coerce any citation away — absence claims carry no receipt
    } else {
      // The receipt must come from THIS requirement's candidate set — the
      // lines the adjudicator was actually shown for it. A merely-real resume
      // line is not enough: evidence that was never in evidence is not a
      // receipt.
      const cited = verdict.resumeLineId;
      resumeLine =
        cited !== null && candidateIds[i].includes(cited)
          ? (lineById.get(cited) ?? null)
          : null;
      if (!resumeLine) {
        throw new DiffError(
          `Verdict for ${req.id} is "${verdict.kind}" but cites ` +
            `${cited === null ? "no resume line" : `${cited}, which is not among its candidates`} — a receipt is required`,
        );
      }
    }
    gaps.push({
      id: `gap-${gaps.length + 1}`,
      kind: verdict.kind,
      requirementId: req.id,
      jdSpan: req.span,
      resumeLineId: resumeLine?.id ?? null,
      resumeSpan: resumeLine?.span ?? null,
      rationale: verdict.rationale,
    });
  }
  return gaps;
}

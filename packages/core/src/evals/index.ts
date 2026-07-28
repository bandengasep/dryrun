// Eval metrics. Pure, isomorphic, offline-testable — no network calls live here.
// The keyed runner (test/evals/*) drives these against real fixture pairs and
// real model calls; this module is only the arithmetic, so it can be unit
// tested without RUN_EVALS and without a key. Not exported from the package
// barrel (src/index.ts) — same precedent as src/harness: evals are consumed by
// the test suite via a relative import, never by the web app.
import type { DebriefReport, Gap } from "../schemas";
import { locateSpan } from "../parsers/spans";

// ---------------------------------------------------------------------------
// Plan-compile pre-guard rates
// ---------------------------------------------------------------------------

/**
 * What fraction of the model's RAW (pre-guard) questions cite a gap id that
 * actually exists. This is measured on the wire the model emitted — before
 * compileSessionPlan's grounding guard runs — because the guard makes the
 * DISPLAYED rate 100% by construction; the interesting number is how often
 * the model needed correcting.
 */
export function questionGroundingRate(
  wireQuestions: { gapId: string }[],
  gapIds: string[],
): { grounded: number; total: number; rate: number } {
  const known = new Set(gapIds);
  const grounded = wireQuestions.filter((q) => known.has(q.gapId)).length;
  const total = wireQuestions.length;
  return { grounded, total, rate: total === 0 ? 1 : grounded / total };
}

/**
 * What fraction of the model's RAW questions satisfy the kind↔STAR
 * biconditional (behavioral ⟺ starHints present) that compileSessionPlan
 * otherwise enforces by throwing / coercing. A wire question fails compliance
 * only when it's behavioral with no hints (a conceptual question WITH hints
 * is coerced, not rejected, by the guard — but it is still non-compliant with
 * the model's own instructions, so it counts against the rate here too).
 */
export function starComplianceRate(
  wireQuestions: { kind: string; starHints: unknown }[],
): number {
  if (wireQuestions.length === 0) return 1;
  const compliant = wireQuestions.filter((q) => {
    const hasHints = q.starHints !== null && q.starHints !== undefined;
    return (q.kind === "behavioral") === hasHints;
  }).length;
  return compliant / wireQuestions.length;
}

/** Counts of questions by kind, e.g. {behavioral: 5, conceptual: 1}. */
export function kindMix(questions: { kind: string }[]): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const q of questions) {
    mix[q.kind] = (mix[q.kind] ?? 0) + 1;
  }
  return mix;
}

/**
 * Groups of question ids whose gap shares a jdSpan.start with another
 * question's gap — the "one JD line, two questions" redundancy observed
 * 2026-07-27 (docs/decision-log.md). Only groups with 2+ questions are
 * returned; a unique jdSpan.start produces no entry.
 */
export function duplicateJdSpanGroups(plan: {
  gaps: Gap[];
  questions: { id: string; gapId: string }[];
}): string[][] {
  const gapById = new Map(plan.gaps.map((g) => [g.id, g]));
  const byStart = new Map<number, string[]>();
  for (const q of plan.questions) {
    const gap = gapById.get(q.gapId);
    if (!gap) continue; // an unknown gapId is the grounding guard's problem, not this one's
    const list = byStart.get(gap.jdSpan.start) ?? [];
    list.push(q.id);
    byStart.set(gap.jdSpan.start, list);
  }
  return [...byStart.values()].filter((ids) => ids.length > 1);
}

// ---------------------------------------------------------------------------
// Debrief citation stats
// ---------------------------------------------------------------------------

/** Displayed (locatable) vs dropped (unlocatable) debrief quotes, and the dropped rate. */
export function debriefCitationStats(report: DebriefReport): {
  displayed: number;
  dropped: number;
  droppedRate: number;
} {
  const displayed = report.perQuestion.reduce((sum, q) => sum + q.covered.length, 0);
  const dropped = report.dropped.length;
  const total = displayed + dropped;
  return { displayed, dropped, droppedRate: total === 0 ? 0 : dropped / total };
}

// ---------------------------------------------------------------------------
// Gap identity + run-to-run consistency
// ---------------------------------------------------------------------------

/**
 * A normalized identity for a gap that's stable across re-runs of diffGaps —
 * ids (gap-1, gap-2, ...) are assignment order, not identity, so consistency
 * measurement needs something else to compare. Normalizes the JD quote
 * (lowercase, collapsed whitespace, trimmed) and pairs it with `kind`, since
 * the same JD line classified differently across runs IS a consistency miss.
 */
export function gapKey(gap: Gap): string {
  const normalized = gap.jdSpan.text.toLowerCase().replace(/\s+/g, " ").trim();
  return `${normalized}|${gap.kind}`;
}

/**
 * Jaccard similarity |A∩B| / |A∪B|. Two empty sets are defined as similarity
 * 1 (vacuously identical — there is no disagreement to measure), rather than
 * the 0/0 that a literal division would produce.
 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  let intersection = 0;
  for (const x of a) {
    if (b.has(x)) intersection++;
  }
  return intersection / union.size;
}

/**
 * Mean Jaccard similarity over every pair of runs, keyed by gapKey. Fewer
 * than 2 runs has nothing to compare, so it returns 1 (vacuously consistent)
 * rather than NaN.
 */
export function meanPairwiseJaccard(runs: Gap[][]): number {
  if (runs.length < 2) return 1;
  const sets = runs.map((gaps) => new Set(gaps.map(gapKey)));
  let sum = 0;
  let count = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      sum += jaccard(sets[i], sets[j]);
      count++;
    }
  }
  return count === 0 ? 1 : sum / count;
}

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

/**
 * USD per million tokens, by model id. Every value starts null — this file
 * NEVER invents a price. The orchestrator fills these in from each vendor's
 * published pricing page before a cost figure is reported anywhere; until
 * then costUSD() returns null for every call, which is itself the honest
 * number (see AGENTS.md rule 5: verify before recommending).
 */
export const PRICES: Record<string, { inPerM: number | null; outPerM: number | null; source: string }> = {
  "gpt-5-mini": { inPerM: 0.25, outPerM: 2.0, source: "OpenAI standard API rate per 1M tokens, cross-checked against two trackers 29 Jul 2026; sanity-check against the billed invoice before the write-up" },
  "gpt-4.1-mini": { inPerM: null, outPerM: null, source: "fallback model, rarely invoked — left unpriced rather than guessed; tokens still reported" },
  "text-embedding-3-small": { inPerM: 0.02, outPerM: 0.0, source: "long-published OpenAI embedding rate per 1M tokens; output tokens are not billed for embeddings" },
  "agnes-2.0-flash": { inPerM: null, outPerM: null, source: "Agnes publishes no per-token price (free tier) — cost reported as null, tokens reported exactly" },
  "agnes-2.5-pro-alpha": { inPerM: null, outPerM: null, source: "Agnes publishes no per-token price — cost null, tokens exact" },
};

export interface CallUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Cost in USD for one call, or null when the model has no price on file. */
export function costUSD(model: string, usage: CallUsage): number | null {
  const price = PRICES[model];
  if (!price || price.inPerM === null || price.outPerM === null) return null;
  return (usage.inputTokens / 1_000_000) * price.inPerM + (usage.outputTokens / 1_000_000) * price.outPerM;
}

// ---------------------------------------------------------------------------
// Citation validity (baseline comparison)
// ---------------------------------------------------------------------------

/**
 * A claim is uncited if it carries no quote, or its quote cannot be located
 * (via locateSpan — the same locator the parsers/debrief use) in ANY of the
 * given sources. Built for the zero-shot baseline, which has no
 * structured-output contract and therefore no guaranteed receipt: this
 * function gives it the benefit of the doubt by trying to find its quotes
 * for it, so the reported rate reflects the model's honesty, not our
 * parsing strictness.
 */
export function uncitedRate(
  claims: { text: string; quote: string | null }[],
  sources: string[],
): { claims: number; uncited: number; rate: number } {
  let uncited = 0;
  for (const claim of claims) {
    const cited =
      claim.quote !== null && sources.some((source) => locateSpan(source, claim.quote as string) !== null);
    if (!cited) uncited++;
  }
  return { claims: claims.length, uncited, rate: claims.length === 0 ? 0 : uncited / claims.length };
}

// ---------------------------------------------------------------------------
// Gold scoring (hand adjudication)
// ---------------------------------------------------------------------------

/**
 * One gap as Timothy adjudicates it. Pre-filled with `verdict: ""` by the
 * adjudication-prep suite; filled in by hand per test/gold/README.md.
 * `verdict` is one of: "" (not yet reviewed), "agree", "wrong_kind:<kind>",
 * or "not_a_requirement".
 */
export interface GoldAdjudicationEntry {
  id: string;
  jdQuote: string;
  resumeQuote: string | null;
  kind: string;
  rationale: string;
  verdict: string;
}

/** The full hand-adjudication file for one fixture pair. */
export interface GoldAdjudication {
  gaps: GoldAdjudicationEntry[];
  /** Verbatim JD quotes for requirements the model's gaps missed entirely. */
  missedRequirements: string[];
}

/**
 * Precision/recall of the model's gaps against Timothy's hand adjudication.
 * `total` is the number of REVIEWED entries (non-empty verdict) whose id is
 * still present among `modelGaps` — a defensive cross-check so a stale
 * adjudication file (re-run against different gap output) doesn't silently
 * inflate the denominator with entries the current model run never produced.
 * `agree` counts verdict === "agree"; `missed` is the count of gold-known
 * requirements the model's gaps never surfaced at all (no receipt to review).
 * precision = agree / total; recall = agree / (agree + missed). Both are null
 * when their denominator is 0 — nothing to score yet, not a score of zero.
 */
export function scoreGold(
  modelGaps: Gap[],
  adjudication: GoldAdjudication,
): { precision: number | null; recall: number | null; agree: number; total: number; missed: number } {
  const modelGapIds = new Set(modelGaps.map((g) => g.id));
  const reviewed = adjudication.gaps.filter(
    (g) => g.verdict.trim().length > 0 && modelGapIds.has(g.id),
  );
  const agree = reviewed.filter((g) => g.verdict === "agree").length;
  const total = reviewed.length;
  const missed = adjudication.missedRequirements.length;
  return {
    precision: total === 0 ? null : agree / total,
    recall: agree + missed === 0 ? null : agree / (agree + missed),
    agree,
    total,
    missed,
  };
}

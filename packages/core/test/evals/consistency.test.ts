// Run-to-run consistency of diffGaps: how similar are the gap sets across 20
// independent runs on the same parsed pair? Measured with meanPairwiseJaccard
// over normalized gap identity (gapKey), not gap id (assignment order isn't
// identity). RUN_EVALS-gated. This suite is LONG — 20 runs x 2 pairs of a
// real adjudication call each, ~60-90 minutes even at concurrency 4 — so
// progress is banner-logged per run rather than only at the end.
import { describe, it, expect } from "vitest";
import OpenAI from "openai";
import { parseJD, parseResume } from "../../src/parsers";
import { diffGaps } from "../../src/diff";
import { meanPairwiseJaccard } from "../../src/evals";
import { evalsEnabled, pairByN, runPool, writeResult } from "./harness";

const TARGET_NS = ["01", "04"];
const RUNS_PER_PAIR = 20;
const CONCURRENCY = 4;

describe.skipIf(!evalsEnabled)("consistency — run-to-run Jaccard stability of diffGaps", () => {
  it(
    `runs diffGaps ${RUNS_PER_PAIR}x on pairs ${TARGET_NS.join("/")} (concurrency ${CONCURRENCY}) — LONG, ~60-90 min`,
    { timeout: 100 * 60_000 },
    async () => {
      const targets = TARGET_NS.map(pairByN).filter((p) => p !== undefined);
      if (targets.length === 0) {
        console.log("[consistency] no target pairs present (pair 04 unpaired?) — skipping silently");
        return;
      }

      const perPair: unknown[] = [];
      // EVAL_MODEL swaps the whole structured lane's model for this run (the
      // 31 Jul model-probe candidates); unset = the shipped default. Rides the
      // spread-last requestOverrides seam, same as the reasoning levers.
      const modelOverrides = process.env.EVAL_MODEL
        ? { model: process.env.EVAL_MODEL }
        : undefined;

      for (const pair of targets) {
        console.log(`[consistency] pair-${pair.n}: starting ${RUNS_PER_PAIR} runs`);
        const client = new OpenAI();
        const [jd, resume] = await Promise.all([
          parseJD(pair.jdText, { client, requestOverrides: modelOverrides }),
          parseResume(pair.resumeText, { client, requestOverrides: modelOverrides }),
        ]);

        // A run where the citation guard rejects the adjudication (DiffError)
        // is DATA, not a crash: it is exactly the per-run reliability rate the
        // guard exists to expose. Count it, report it, and compute Jaccard
        // over the runs that survived — killing the whole suite on one
        // rejected run (as this suite originally did) hid the number.
        let completed = 0;
        const outcomes = await runPool(RUNS_PER_PAIR, CONCURRENCY, async () => {
          try {
            const gaps = await diffGaps(jd, resume, { client, requestOverrides: modelOverrides });
            completed++;
            console.log(`[consistency] pair-${pair.n}: run ${completed}/${RUNS_PER_PAIR} done (${gaps.length} gaps)`);
            return { ok: true as const, gaps };
          } catch (e) {
            completed++;
            const message = e instanceof Error ? e.message : String(e);
            console.log(`[consistency] pair-${pair.n}: run ${completed}/${RUNS_PER_PAIR} GUARD-REJECTED — ${message}`);
            return { ok: false as const, message };
          }
        });

        const okRuns = outcomes.filter((o) => o.ok).map((o) => o.gaps);
        const rejected = outcomes.filter((o) => !o.ok);
        const meanJaccard = okRuns.length >= 2 ? meanPairwiseJaccard(okRuns) : null;
        perPair.push({
          n: pair.n,
          runsAttempted: outcomes.length,
          runsSucceeded: okRuns.length,
          guardRejectedRuns: rejected.length,
          guardRejectionMessages: rejected.map((r) => r.message),
          gapCounts: okRuns.map((r) => r.length),
          meanPairwiseJaccard: meanJaccard,
        });
        console.log(
          `[consistency] pair-${pair.n}: meanPairwiseJaccard=${meanJaccard === null ? "n/a" : meanJaccard.toFixed(3)} ` +
            `(${okRuns.length}/${outcomes.length} runs survived the guard)`,
        );
      }

      const jaccards = perPair
        .map((p) => (p as { meanPairwiseJaccard: number | null }).meanPairwiseJaccard)
        .filter((j): j is number => typeof j === "number");
      const totalAttempted = perPair.reduce<number>(
        (s, p) => s + (p as { runsAttempted: number }).runsAttempted,
        0,
      );
      const totalRejected = perPair.reduce<number>(
        (s, p) => s + (p as { guardRejectedRuns: number }).guardRejectedRuns,
        0,
      );
      const meanJaccard = jaccards.length === 0 ? null : jaccards.reduce((a, b) => a + b, 0) / jaccards.length;

      await writeResult(
        process.env.EVAL_MODEL ? `consistency-${process.env.EVAL_MODEL}` : "consistency",
        {
          corpus: targets.map((p) => p.n),
          config: {
            runsPerPair: RUNS_PER_PAIR,
            concurrency: CONCURRENCY,
            model: process.env.EVAL_MODEL ?? "gpt-5-mini (default)",
          },
          metrics: {},
          perPair,
        },
        {
          mean_pairwise_jaccard: meanJaccard,
          guard_rejection_rate: totalAttempted === 0 ? null : totalRejected / totalAttempted,
        },
      );

      expect(perPair.length).toBeGreaterThan(0);
    },
  );
});

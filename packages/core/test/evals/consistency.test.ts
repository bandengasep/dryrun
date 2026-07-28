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

      for (const pair of targets) {
        console.log(`[consistency] pair-${pair.n}: starting ${RUNS_PER_PAIR} runs`);
        const client = new OpenAI();
        const [jd, resume] = await Promise.all([
          parseJD(pair.jdText, { client }),
          parseResume(pair.resumeText, { client }),
        ]);

        let completed = 0;
        const runs = await runPool(RUNS_PER_PAIR, CONCURRENCY, async () => {
          const gaps = await diffGaps(jd, resume, { client });
          completed++;
          console.log(`[consistency] pair-${pair.n}: run ${completed}/${RUNS_PER_PAIR} done (${gaps.length} gaps)`);
          return gaps;
        });

        const meanJaccard = meanPairwiseJaccard(runs);
        perPair.push({
          n: pair.n,
          runs: runs.length,
          gapCounts: runs.map((r) => r.length),
          meanPairwiseJaccard: meanJaccard,
        });
        console.log(`[consistency] pair-${pair.n}: meanPairwiseJaccard=${meanJaccard.toFixed(3)}`);
      }

      writeResult("consistency", {
        corpus: targets.map((p) => p.n),
        config: { runsPerPair: RUNS_PER_PAIR, concurrency: CONCURRENCY, model: "gpt-5-mini (default)" },
        metrics: {},
        perPair,
      });

      expect(perPair.length).toBeGreaterThan(0);
    },
  );
});

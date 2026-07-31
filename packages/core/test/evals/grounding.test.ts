// Measures the plan compiler's PRE-GUARD rates: how often the model's raw
// output would have been grounded/STAR-compliant if compileSessionPlan's
// guards did not exist. The displayed rate is 100% by construction (the
// guards throw/coerce), so this is the number that actually moves. RUN_EVALS-
// gated — calls OpenAI for every pair.
import { describe, it, expect } from "vitest";
import OpenAI from "openai";
import { parseJD, parseResume } from "../../src/parsers";
import { diffGaps } from "../../src/diff";
import { compileSessionPlan } from "../../src/plan";
import type { PlanWire } from "../../src/plan/wire";
import {
  duplicateJdSpanGroups,
  kindMix,
  questionGroundingRate,
  starComplianceRate,
} from "../../src/evals";
import { evalsEnabled, loadPairs, makeMeteredClient, writeResult } from "./harness";

describe.skipIf(!evalsEnabled)("grounding — plan-compile pre-guard rates", () => {
  it(
    "measures pre-guard grounding / STAR compliance / kind mix / jdSpan duplication across every fixture pair",
    { timeout: 20 * 60_000 },
    async () => {
      const pairs = loadPairs();
      expect(pairs.length).toBeGreaterThan(0);
      const perPair: unknown[] = [];
      // EVAL_MODEL swaps the whole structured lane's model for this run —
      // see consistency.test.ts for the rationale.
      const modelOverrides = process.env.EVAL_MODEL
        ? { model: process.env.EVAL_MODEL }
        : undefined;

      for (const pair of pairs) {
        const client = new OpenAI();
        const metered = makeMeteredClient(client, { suite: "grounding", pair: pair.n });

        const [jd, resume] = await Promise.all([
          parseJD(pair.jdText, { client: metered.client, requestOverrides: modelOverrides }),
          parseResume(pair.resumeText, { client: metered.client, requestOverrides: modelOverrides }),
        ]);
        const gaps = await diffGaps(jd, resume, { client: metered.client, requestOverrides: modelOverrides });
        if (gaps.length === 0) {
          console.log(`[grounding] pair-${pair.n}: 0 gaps, skipping plan compile`);
          perPair.push({ n: pair.n, skipped: "no gaps" });
          continue;
        }

        let wire: PlanWire | undefined;
        const plan = await compileSessionPlan(gaps, pair.jdText, pair.resumeText, {
          client: metered.client,
          requestOverrides: modelOverrides,
          onWire: (w) => {
            wire = w as PlanWire;
          },
        });
        expect(wire).toBeDefined();
        const capturedWire = wire as PlanWire;

        const gapIds = gaps.map((g) => g.id);
        const grounding = questionGroundingRate(capturedWire.questions, gapIds);
        const star = starComplianceRate(capturedWire.questions);
        const mix = kindMix(capturedWire.questions);
        const dupes = duplicateJdSpanGroups(plan);

        perPair.push({
          n: pair.n,
          gapCount: gaps.length,
          grounding,
          star,
          mix,
          duplicateGroups: dupes,
        });
        console.log(
          `[grounding] pair-${pair.n}: grounding=${grounding.rate.toFixed(2)} star=${star.toFixed(2)} duplicateGroups=${dupes.length}`,
        );
      }

      const groundingRates = perPair
        .map((p) => (p as { grounding?: { rate: number } }).grounding?.rate)
        .filter((r): r is number => typeof r === "number");
      const starRates = perPair
        .map((p) => (p as { star?: number }).star)
        .filter((r): r is number => typeof r === "number");
      const mean = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

      await writeResult(
        process.env.EVAL_MODEL ? `grounding-${process.env.EVAL_MODEL}` : "grounding",
        {
          corpus: pairs.map((p) => p.n),
          config: { model: process.env.EVAL_MODEL ?? "gpt-5-mini (default)" },
          metrics: {},
          perPair,
        },
        { grounding_rate: mean(groundingRates), star_compliance_rate: mean(starRates) },
      );
    },
  );
});

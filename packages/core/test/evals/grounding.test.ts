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

      for (const pair of pairs) {
        const client = new OpenAI();
        const metered = makeMeteredClient(client);

        const [jd, resume] = await Promise.all([
          parseJD(pair.jdText, { client: metered.client }),
          parseResume(pair.resumeText, { client: metered.client }),
        ]);
        const gaps = await diffGaps(jd, resume, { client: metered.client });
        if (gaps.length === 0) {
          console.log(`[grounding] pair-${pair.n}: 0 gaps, skipping plan compile`);
          perPair.push({ n: pair.n, skipped: "no gaps" });
          continue;
        }

        let wire: PlanWire | undefined;
        const plan = await compileSessionPlan(gaps, pair.jdText, pair.resumeText, {
          client: metered.client,
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

      writeResult("grounding", {
        corpus: pairs.map((p) => p.n),
        config: { model: "gpt-5-mini (default)" },
        metrics: {},
        perPair,
      });
    },
  );
});

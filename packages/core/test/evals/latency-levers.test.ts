// Measures the latency/cost lever identified 2026-07-27/28 (docs/decision-log.md):
// reasoning_effort on the receipts-critical parse/diff/plan lane. Deliberately
// does NOT judge gap quality here — it just runs the configs and SAVES the
// gaps produced, so gold-score.test.ts (against Timothy's hand adjudication)
// is the honest arbiter of whether a faster config is still an acceptable
// one. RUN_EVALS-gated; LONG (3 configs x 2 pairs x 3 runs of parse+diff, plus
// plan on pair 01).
import { describe, it, expect } from "vitest";
import OpenAI from "openai";
import { parseJD, parseResume } from "../../src/parsers";
import { diffGaps } from "../../src/diff";
import { compileSessionPlan } from "../../src/plan";
import { evalsEnabled, makeMeteredClient, pairByN, writeResult } from "./harness";

interface LatencyConfig {
  name: string;
  requestOverrides?: Record<string, unknown>;
}

const CONFIGS: LatencyConfig[] = [
  { name: "baseline" },
  { name: "low", requestOverrides: { reasoning: { effort: "low" } } },
  { name: "minimal", requestOverrides: { reasoning: { effort: "minimal" } } },
];

const PAIR_NS = ["01", "04"];
const RUNS_PER_CONFIG = 3;
/** Plan compile is only run for this pair — running it for every config x pair
 * x run would multiply cost for a stage this suite isn't primarily targeting. */
const PLAN_PAIR_N = "01";

describe.skipIf(!evalsEnabled)(
  "latency-levers — reasoning_effort tradeoff on the receipts-critical parse/diff/plan lane",
  () => {
    it(
      `runs parse+diff (+plan on pair ${PLAN_PAIR_N}) ${RUNS_PER_CONFIG}x per config x pair, saving gaps for later gold-scoring`,
      { timeout: 30 * 60_000 },
      async () => {
        const perRun: unknown[] = [];

        for (const config of CONFIGS) {
          for (const n of PAIR_NS) {
            const pair = pairByN(n);
            if (!pair) {
              console.log(`[latency-levers] pair-${n} unpaired, skipping`);
              continue;
            }

            for (let run = 0; run < RUNS_PER_CONFIG; run++) {
              const client = new OpenAI();
              const metered = makeMeteredClient(client);
              const parseOpts = { client: metered.client, requestOverrides: config.requestOverrides };

              const start = performance.now();
              const [jd, resume] = await Promise.all([
                parseJD(pair.jdText, parseOpts),
                parseResume(pair.resumeText, parseOpts),
              ]);
              const gaps = await diffGaps(jd, resume, {
                client: metered.client,
                requestOverrides: config.requestOverrides,
              });

              let planQuestions: number | null = null;
              if (n === PLAN_PAIR_N && gaps.length > 0) {
                const plan = await compileSessionPlan(gaps, pair.jdText, pair.resumeText, {
                  client: metered.client,
                  requestOverrides: config.requestOverrides,
                });
                planQuestions = plan.questions.length;
              }
              const wallMs = performance.now() - start;

              perRun.push({
                config: config.name,
                pair: n,
                run,
                wallMs,
                gapCount: gaps.length,
                planQuestions,
                gaps,
                calls: metered.calls,
              });
              console.log(
                `[latency-levers] config=${config.name} pair-${n} run=${run + 1}/${RUNS_PER_CONFIG} wallMs=${wallMs.toFixed(0)}`,
              );
            }
          }
        }

        writeResult("latency-levers", {
          corpus: PAIR_NS,
          config: { configs: CONFIGS.map((c) => c.name), runsPerConfig: RUNS_PER_CONFIG, planPair: PLAN_PAIR_N },
          metrics: {},
          perPair: perRun,
        });

        expect(perRun.length).toBeGreaterThan(0);
      },
    );

    // Interviewer first-token trim experiment — SKELETON. Needs a trimmed
    // system-prompt variant (buildInterviewerMessages lives in src/session,
    // outside this lane's ownership) and live calls against both Agnes and
    // the OpenAI failover lane. Per docs/decision-log.md 2026-07-28: "cheapest
    // untried lever is trimming the interviewer system prompt (currently
    // ~1.2k chars incl. gap receipts)". Orchestrator runs this Thursday once
    // the trimmed variant exists.
    it.skip("interviewer first-token trim: original system prompt vs a trimmed variant, Agnes + OpenAI failover lane", () => {
      // Fill in once src/session exposes (or gains) a trimmed prompt variant.
    });
  },
);

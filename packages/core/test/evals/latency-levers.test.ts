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
  /**
   * Apply the override to the parse calls only, leaving diff (and plan) at
   * baseline effort. Parse is extraction — its failures surface mechanically in
   * `dropped[]` — while diff is the judgment call the receipts guard protects;
   * splitting the lever targets the dominant latency slice (the JD parse) with
   * the smallest quality surface. Motivated by the 31 Jul sweep: full "low"
   * tripped the diff candidate-set guard (1 of 3 runs on pair-01).
   */
  parseOnly?: boolean;
}

const CONFIGS: LatencyConfig[] = [
  // Round 3 (31 Jul, model probe). Rounds 1-2 verdicts, banked in
  // latency-levers-2026-07-31.json + the orchestrator log: "baseline"
  // 117-151s; full "low" ~57s but 1/3 diff-guard rejections; "minimal"
  // 31-35s but requirement extraction COLLAPSED (pair-01: 13-16 lines vs
  // baseline's ~22-29) — speed bought with silent recall loss, rejected on
  // mechanical evidence; "minimal-parse-only" same collapse; "low-parse-only"
  // healthy counts (28/31) but 2/4 rejections and barely faster. Conclusion:
  // parse latency is output-token-bound (verbatim receipts x requirement
  // count), so effort knobs only speed it up by extracting less. This round
  // asks whether a NEWER model generates faster at full extraction quality —
  // model override rides requestOverrides' spread-last position.
  { name: "gpt-5.4-mini", requestOverrides: { model: "gpt-5.4-mini" } },
  { name: "gpt-5.6-luna", requestOverrides: { model: "gpt-5.6-luna" } },
];

const PAIR_NS = ["01", "04"];
/** Screening pass only — the decisive rejection-rate and consistency stats come
 * from the 20-run consistency suite re-run on whichever config wins. */
const RUNS_PER_CONFIG = 2;
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
              const metered = makeMeteredClient(client, {
                suite: "latency-levers",
                pair: `${config.name}:${n}:run${run}`,
              });
              const parseOpts = { client: metered.client, requestOverrides: config.requestOverrides };
              // parseOnly configs keep diff (and plan) at baseline effort.
              const diffOverrides = config.parseOnly ? undefined : config.requestOverrides;

              const start = performance.now();
              try {
                const [jd, resume] = await Promise.all([
                  parseJD(pair.jdText, parseOpts),
                  parseResume(pair.resumeText, parseOpts),
                ]);
                const gaps = await diffGaps(jd, resume, {
                  client: metered.client,
                  requestOverrides: diffOverrides,
                });

                let planQuestions: number | null = null;
                if (n === PLAN_PAIR_N && gaps.length > 0) {
                  const plan = await compileSessionPlan(gaps, pair.jdText, pair.resumeText, {
                    client: metered.client,
                    requestOverrides: diffOverrides,
                  });
                  planQuestions = plan.questions.length;
                }
                const wallMs = performance.now() - start;

                perRun.push({
                  config: config.name,
                  pair: n,
                  run,
                  wallMs,
                  jdLines: jd.lines.length,
                  cvLines: resume.lines.length,
                  droppedLines: jd.dropped.length + resume.dropped.length,
                  gapCount: gaps.length,
                  planQuestions,
                  gaps,
                  calls: metered.calls,
                });
                console.log(
                  `[latency-levers] config=${config.name} pair-${n} run=${run + 1}/${RUNS_PER_CONFIG} wallMs=${wallMs.toFixed(0)}`,
                );
              } catch (err) {
                // A receipts-guard rejection (or any run failure) is DATA, not a
                // crash: record it and keep the sweep alive — rejection rate is a
                // first-class gate metric (the 31 Jul sweep died mid-flight and
                // lost its usage data by throwing here).
                const wallMs = performance.now() - start;
                perRun.push({
                  config: config.name,
                  pair: n,
                  run,
                  wallMs,
                  failed: true,
                  error: `${(err as Error).name}: ${(err as Error).message}`,
                  gapCount: null,
                  planQuestions: null,
                  gaps: [],
                  calls: metered.calls,
                });
                console.log(
                  `[latency-levers] config=${config.name} pair-${n} run=${run + 1}/${RUNS_PER_CONFIG} FAILED: ${(err as Error).message}`,
                );
              }
            }
          }
        }

        const meanWallMsByConfig: Record<string, number | null> = {};
        const failedByConfig: Record<string, number> = {};
        for (const c of CONFIGS) {
          const runs = perRun.filter(
            (r) => (r as { config: string }).config === c.name,
          );
          // Failed runs are excluded from the mean (their wall time is partial)
          // but counted — the rejection rate is reported alongside the speedup.
          const ms = runs
            .filter((r) => !(r as { failed?: boolean }).failed)
            .map((r) => (r as { wallMs: number }).wallMs);
          meanWallMsByConfig[`wallMs_${c.name}`] =
            ms.length === 0 ? null : ms.reduce((a, b) => a + b, 0) / ms.length;
          failedByConfig[c.name] = runs.filter(
            (r) => (r as { failed?: boolean }).failed,
          ).length;
        }

        await writeResult(
          "latency-levers",
          {
            corpus: PAIR_NS,
            config: { configs: CONFIGS.map((c) => c.name), runsPerConfig: RUNS_PER_CONFIG, planPair: PLAN_PAIR_N },
            metrics: { failedByConfig },
            perPair: perRun,
          },
          meanWallMsByConfig,
        );

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

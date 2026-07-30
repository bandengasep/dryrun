// Generates the gold-adjudication scaffolding: for every fixture pair, runs
// the real parse/diff pipeline and writes test/gold/pair-NN.model.json (the
// full model output) plus test/gold/pair-NN.adjudication.json (pre-filled
// with empty verdicts, ready for Timothy to hand-adjudicate per
// test/gold/README.md). RUN_EVALS-gated (see harness.ts) — this calls OpenAI
// for every pair.
import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import OpenAI from "openai";
import { parseJD, parseResume } from "../../src/parsers";
import { diffGaps } from "../../src/diff";
import type { Gap } from "../../src/schemas";
import type { GoldAdjudicationEntry } from "../../src/evals";
import { evalsEnabled, loadPairs, makeMeteredClient, writeResult } from "./harness";

const GOLD_DIR = resolve(import.meta.dirname, "../gold");

describe.skipIf(!evalsEnabled)(
  "adjudication-prep — writes gold-adjudication scaffolding from a real compile",
  () => {
    it(
      "parses + diffs every fixture pair and writes model.json / adjudication.json per pair",
      { timeout: 20 * 60_000 },
      async () => {
        mkdirSync(GOLD_DIR, { recursive: true });
        const pairs = loadPairs();
        expect(pairs.length).toBeGreaterThan(0);

        const perPair: unknown[] = [];

        for (const pair of pairs) {
          const client = new OpenAI();
          const metered = makeMeteredClient(client, { suite: "adjudication-prep", pair: pair.n });

          const [jd, resume] = await Promise.all([
            parseJD(pair.jdText, { client: metered.client }),
            parseResume(pair.resumeText, { client: metered.client }),
          ]);
          const gaps: Gap[] = await diffGaps(jd, resume, { client: metered.client });

          const modelPath = resolve(GOLD_DIR, `pair-${pair.n}.model.json`);
          writeFileSync(modelPath, JSON.stringify({ jd, resume, gaps }, null, 2), "utf8");

          const adjudicationPath = resolve(GOLD_DIR, `pair-${pair.n}.adjudication.json`);
          if (existsSync(adjudicationPath)) {
            // Never clobber Timothy's in-progress hand adjudication — a re-run
            // (e.g. after a model/prompt change) must not silently erase
            // verdicts he already filled in.
            console.log(
              `[adjudication-prep] pair-${pair.n}: adjudication.json already exists — leaving it untouched`,
            );
          } else {
            const entries: GoldAdjudicationEntry[] = gaps.map((g) => ({
              id: g.id,
              jdQuote: g.jdSpan.text,
              resumeQuote: g.resumeSpan?.text ?? null,
              kind: g.kind,
              rationale: g.rationale,
              verdict: "",
            }));
            writeFileSync(
              adjudicationPath,
              JSON.stringify({ gaps: entries, missedRequirements: [] }, null, 2),
              "utf8",
            );
          }

          perPair.push({ n: pair.n, gapCount: gaps.length, calls: metered.calls });
          console.log(`[adjudication-prep] pair-${pair.n}: ${gaps.length} gaps written`);
        }

        await writeResult("adjudication-prep", {
          corpus: pairs.map((p) => p.n),
          config: { model: "gpt-5-mini (default)" },
          metrics: {},
          perPair,
        });
      },
    );
  },
);

// Precision/recall of the model's gaps against Timothy's hand adjudication.
// Deliberately NOT RUN_EVALS-gated: it makes no model call, only reads
// test/gold/*.adjudication.json + *.model.json off disk, so it's cheap and
// safe to run in a normal `pnpm test`. When nothing has been adjudicated yet
// it skips with an explanatory message instead of failing.
import { describe, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scoreGold, type GoldAdjudication } from "../../src/evals";
import type { Gap } from "../../src/schemas";
import { writeResult } from "./harness";

const GOLD_DIR = resolve(import.meta.dirname, "../gold");

function listPairNs(): string[] {
  if (!existsSync(GOLD_DIR)) return [];
  const files = readdirSync(GOLD_DIR);
  const ns = new Set<string>();
  for (const f of files) {
    const m = /^pair-(\d+)\.adjudication\.json$/.exec(f);
    if (m) ns.add(m[1]);
  }
  return [...ns].sort();
}

function readAdjudication(n: string): GoldAdjudication {
  const path = resolve(GOLD_DIR, `pair-${n}.adjudication.json`);
  return JSON.parse(readFileSync(path, "utf8")) as GoldAdjudication;
}

const pairNs = listPairNs();
const anyVerdictFilled = pairNs.some((n) => readAdjudication(n).gaps.some((g) => g.verdict.trim().length > 0));

describe("gold-score — precision/recall against hand adjudication", () => {
  if (!anyVerdictFilled) {
    it.skip(
      "no verdicts filled in yet — run `pnpm evals` (writes test/gold/*.adjudication.json scaffolding), " +
        "then hand-adjudicate per test/gold/README.md, then re-run this test",
      () => {},
    );
    return;
  }

  it("computes precision/recall per pair and an aggregate, from whatever verdicts are filled in so far", async () => {
    interface PairScore {
      n: string;
      precision: number | null;
      recall: number | null;
      agree: number;
      total: number;
      missed: number;
    }
    const perPair: PairScore[] = [];

    for (const n of pairNs) {
      const modelPath = resolve(GOLD_DIR, `pair-${n}.model.json`);
      if (!existsSync(modelPath)) continue; // adjudication without its model.json can't be scored
      const adjudication = readAdjudication(n);
      const model = JSON.parse(readFileSync(modelPath, "utf8")) as { gaps: Gap[] };
      const score = scoreGold(model.gaps, adjudication);
      perPair.push({ n, ...score });
    }

    const totalAgree = perPair.reduce((s, p) => s + p.agree, 0);
    const totalReviewed = perPair.reduce((s, p) => s + p.total, 0);
    const totalMissed = perPair.reduce((s, p) => s + p.missed, 0);
    const aggregate = {
      precision: totalReviewed === 0 ? null : totalAgree / totalReviewed,
      recall: totalAgree + totalMissed === 0 ? null : totalAgree / (totalAgree + totalMissed),
      agree: totalAgree,
      total: totalReviewed,
      missed: totalMissed,
    };

    console.table(perPair);
    console.table([{ n: "aggregate", ...aggregate }]);

    await writeResult(
      "gold-score",
      {
        corpus: pairNs,
        config: {},
        metrics: { aggregate },
        perPair,
      },
      { gold_precision: aggregate.precision, gold_recall: aggregate.recall },
    );
  });
});

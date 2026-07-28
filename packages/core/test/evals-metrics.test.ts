import { describe, it, expect } from "vitest";
import {
  costUSD,
  debriefCitationStats,
  duplicateJdSpanGroups,
  gapKey,
  jaccard,
  kindMix,
  meanPairwiseJaccard,
  PRICES,
  questionGroundingRate,
  scoreGold,
  starComplianceRate,
  uncitedRate,
  type GoldAdjudication,
} from "../src/evals";
import type { DebriefReport, Gap } from "../src/schemas";

const gap = (overrides: Partial<Gap> & Pick<Gap, "id">): Gap => ({
  id: overrides.id,
  kind: overrides.kind ?? "missing_skill",
  requirementId: overrides.requirementId ?? `req-${overrides.id}`,
  jdSpan: overrides.jdSpan ?? { start: 0, end: 3, text: "SQL" },
  resumeLineId: overrides.resumeLineId ?? null,
  resumeSpan: overrides.resumeSpan ?? null,
  rationale: overrides.rationale ?? "because",
});

describe("questionGroundingRate", () => {
  it("counts questions whose gapId is known", () => {
    const result = questionGroundingRate(
      [{ gapId: "gap-1" }, { gapId: "gap-2" }, { gapId: "gap-99" }],
      ["gap-1", "gap-2"],
    );
    expect(result).toEqual({ grounded: 2, total: 3, rate: 2 / 3 });
  });

  it("returns rate 1 for an empty question list (nothing to be ungrounded)", () => {
    expect(questionGroundingRate([], ["gap-1"])).toEqual({ grounded: 0, total: 0, rate: 1 });
  });

  it("returns rate 0 when nothing is grounded", () => {
    const result = questionGroundingRate([{ gapId: "gap-99" }], ["gap-1"]);
    expect(result.rate).toBe(0);
  });
});

describe("starComplianceRate", () => {
  it("returns 1 when every question satisfies the kind<->STAR biconditional", () => {
    const rate = starComplianceRate([
      { kind: "behavioral", starHints: { situation: "s", task: "t", action: "a", result: "r" } },
      { kind: "conceptual", starHints: null },
    ]);
    expect(rate).toBe(1);
  });

  it("penalizes a behavioral question with no hints", () => {
    const rate = starComplianceRate([
      { kind: "behavioral", starHints: null },
      { kind: "conceptual", starHints: null },
    ]);
    expect(rate).toBe(0.5);
  });

  it("penalizes a conceptual question that carries hints", () => {
    const rate = starComplianceRate([
      { kind: "conceptual", starHints: { situation: "s", task: "t", action: "a", result: "r" } },
    ]);
    expect(rate).toBe(0);
  });

  it("treats undefined starHints the same as null (missing is missing)", () => {
    const rate = starComplianceRate([{ kind: "conceptual", starHints: undefined }]);
    expect(rate).toBe(1);
  });

  it("returns 1 for an empty question list", () => {
    expect(starComplianceRate([])).toBe(1);
  });
});

describe("kindMix", () => {
  it("counts questions by kind", () => {
    expect(
      kindMix([{ kind: "behavioral" }, { kind: "behavioral" }, { kind: "conceptual" }]),
    ).toEqual({ behavioral: 2, conceptual: 1 });
  });

  it("returns an empty object for no questions", () => {
    expect(kindMix([])).toEqual({});
  });
});

describe("duplicateJdSpanGroups", () => {
  const gaps: Gap[] = [
    gap({ id: "gap-1", jdSpan: { start: 0, end: 10, text: "same JD line" } }),
    gap({ id: "gap-2", jdSpan: { start: 0, end: 10, text: "same JD line" } }),
    gap({ id: "gap-3", jdSpan: { start: 20, end: 25, text: "other" } }),
  ];
  const questions = [
    { id: "q-1", gapId: "gap-1" },
    { id: "q-2", gapId: "gap-2" },
    { id: "q-3", gapId: "gap-3" },
  ];

  it("groups question ids whose gaps share a jdSpan.start", () => {
    expect(duplicateJdSpanGroups({ gaps, questions })).toEqual([["q-1", "q-2"]]);
  });

  it("returns no groups when every jdSpan.start is unique", () => {
    const uniqueGaps: Gap[] = [
      gap({ id: "gap-1", jdSpan: { start: 0, end: 3, text: "a" } }),
      gap({ id: "gap-2", jdSpan: { start: 10, end: 13, text: "b" } }),
    ];
    const uniqueQuestions = [
      { id: "q-1", gapId: "gap-1" },
      { id: "q-2", gapId: "gap-2" },
    ];
    expect(duplicateJdSpanGroups({ gaps: uniqueGaps, questions: uniqueQuestions })).toEqual([]);
  });

  it("ignores a question whose gapId is unknown, rather than throwing", () => {
    expect(
      duplicateJdSpanGroups({ gaps, questions: [...questions, { id: "q-4", gapId: "gap-999" }] }),
    ).toEqual([["q-1", "q-2"]]);
  });

  it("returns [] for no questions", () => {
    expect(duplicateJdSpanGroups({ gaps, questions: [] })).toEqual([]);
  });
});

describe("debriefCitationStats", () => {
  const emptyReport: DebriefReport = { planId: "plan-1", perQuestion: [], dropped: [] };

  it("counts covered points across every question as displayed", () => {
    const report: DebriefReport = {
      planId: "plan-1",
      perQuestion: [
        {
          questionId: "q-1",
          gapId: "gap-1",
          summary: "s",
          covered: [
            { claim: "a", quote: { turnIndex: 0, span: { start: 0, end: 1, text: "x" }, videoTime: null } },
            { claim: "b", quote: { turnIndex: 0, span: { start: 1, end: 2, text: "y" }, videoTime: null } },
          ],
          missed: [],
          attempted: true,
        },
        {
          questionId: "q-2",
          gapId: "gap-2",
          summary: "s",
          covered: [
            { claim: "c", quote: { turnIndex: 1, span: { start: 0, end: 1, text: "z" }, videoTime: null } },
          ],
          missed: [],
          attempted: true,
        },
      ],
      dropped: [{ questionId: "q-1", claim: "d", quote: "nope", reason: "quote_not_found" }],
    };
    expect(debriefCitationStats(report)).toEqual({ displayed: 3, dropped: 1, droppedRate: 0.25 });
  });

  it("returns droppedRate 0 for an entirely empty report (0/0, not NaN)", () => {
    expect(debriefCitationStats(emptyReport)).toEqual({ displayed: 0, dropped: 0, droppedRate: 0 });
  });
});

describe("gapKey", () => {
  it("lowercases and collapses whitespace in the JD quote, pairing it with kind", () => {
    const g = gap({ id: "gap-1", kind: "weak_evidence", jdSpan: { start: 0, end: 20, text: "3+   Years  of\nSQL" } });
    expect(gapKey(g)).toBe("3+ years of sql|weak_evidence");
  });

  it("treats different casing/whitespace of the same quote as the same key", () => {
    const a = gap({ id: "gap-1", jdSpan: { start: 0, end: 3, text: "SQL" } });
    const b = gap({ id: "gap-2", jdSpan: { start: 10, end: 13, text: "  sql  " } });
    expect(gapKey(a)).toBe(gapKey(b));
  });

  it("treats the same quote under a different kind as a different key", () => {
    const a = gap({ id: "gap-1", kind: "missing_skill", jdSpan: { start: 0, end: 3, text: "SQL" } });
    const b = gap({ id: "gap-2", kind: "weak_evidence", jdSpan: { start: 0, end: 3, text: "SQL" } });
    expect(gapKey(a)).not.toBe(gapKey(b));
  });
});

describe("jaccard", () => {
  it("computes intersection over union", () => {
    expect(jaccard(new Set(["a", "b", "c"]), new Set(["b", "c", "d"]))).toBeCloseTo(2 / 4);
  });

  it("returns 1 for two identical sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("returns 0 for two disjoint non-empty sets", () => {
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("returns 1 for two empty sets (vacuously identical, not 0/0)", () => {
    expect(jaccard(new Set(), new Set())).toBe(1);
  });
});

describe("meanPairwiseJaccard", () => {
  it("returns 1 for identical runs (perfect consistency)", () => {
    const gaps: Gap[] = [gap({ id: "gap-1", jdSpan: { start: 0, end: 3, text: "SQL" } })];
    expect(meanPairwiseJaccard([gaps, gaps, gaps])).toBe(1);
  });

  it("averages jaccard over every pair of runs", () => {
    const runA: Gap[] = [gap({ id: "gap-1", jdSpan: { start: 0, end: 3, text: "SQL" } })];
    const runB: Gap[] = [
      gap({ id: "gap-1", jdSpan: { start: 0, end: 3, text: "SQL" } }),
      gap({ id: "gap-2", jdSpan: { start: 10, end: 13, text: "dbt" } }),
    ];
    // jaccard(A,B) = |{sql}| / |{sql,dbt}| = 0.5; only one pair with 2 runs.
    expect(meanPairwiseJaccard([runA, runB])).toBeCloseTo(0.5);
  });

  it("returns 1 for fewer than 2 runs (nothing to compare)", () => {
    expect(meanPairwiseJaccard([])).toBe(1);
    expect(meanPairwiseJaccard([[gap({ id: "gap-1" })]])).toBe(1);
  });

  it("de-duplicates identical gaps within a single run before comparing (Set semantics)", () => {
    const runA: Gap[] = [
      gap({ id: "gap-1", jdSpan: { start: 0, end: 3, text: "SQL" } }),
      gap({ id: "gap-2", jdSpan: { start: 0, end: 3, text: "SQL" } }), // same key as gap-1
    ];
    const runB: Gap[] = [gap({ id: "gap-1", jdSpan: { start: 0, end: 3, text: "SQL" } })];
    expect(meanPairwiseJaccard([runA, runB])).toBe(1);
  });
});

describe("PRICES / costUSD", () => {
  it("every price entry cites a source; no price exists without one", () => {
    for (const price of Object.values(PRICES)) {
      expect(price.source.length).toBeGreaterThan(10);
      // A half-filled price would silently miscost calls: in and out are
      // filled together or not at all (0 is a legitimate rate — embeddings
      // bill no output tokens — null is "no price on file").
      expect(price.inPerM === null).toBe(price.outPerM === null);
    }
  });

  it("prices a known model from the table (worked example, pinned)", () => {
    // gpt-5-mini at $0.25/M in + $2.00/M out → 1k tokens each way = $0.00225
    expect(costUSD("gpt-5-mini", { inputTokens: 1000, outputTokens: 1000 })).toBeCloseTo(0.00225, 6);
  });

  it("returns null for a model with no price on file", () => {
    // gpt-4.1-mini is deliberately unpriced (rare fallback; tokens still reported)
    expect(costUSD("gpt-4.1-mini", { inputTokens: 1000, outputTokens: 1000 })).toBeNull();
  });

  it("returns null for a completely unknown model id", () => {
    expect(costUSD("some-model-nobody-priced", { inputTokens: 1, outputTokens: 1 })).toBeNull();
  });
});

describe("uncitedRate", () => {
  const SOURCES = ["We need 3+ years of SQL experience.", "I wrote SQL for five years."];

  it("counts a claim with a null quote as uncited", () => {
    const result = uncitedRate([{ text: "claim", quote: null }], SOURCES);
    expect(result).toEqual({ claims: 1, uncited: 1, rate: 1 });
  });

  it("counts a claim whose quote locates in a source as cited", () => {
    const result = uncitedRate([{ text: "claim", quote: "wrote SQL" }], SOURCES);
    expect(result).toEqual({ claims: 1, uncited: 0, rate: 0 });
  });

  it("counts a claim whose quote locates in NO source as uncited", () => {
    const result = uncitedRate([{ text: "claim", quote: "used Python extensively" }], SOURCES);
    expect(result).toEqual({ claims: 1, uncited: 1, rate: 1 });
  });

  it("handles duplicate quotes across claims independently (each re-located from scratch)", () => {
    const claims = [
      { text: "first", quote: "wrote SQL" },
      { text: "second", quote: "wrote SQL" },
    ];
    const result = uncitedRate(claims, SOURCES);
    expect(result).toEqual({ claims: 2, uncited: 0, rate: 0 });
  });

  it("returns rate 0 for an empty claim list (0/0, not NaN)", () => {
    expect(uncitedRate([], SOURCES)).toEqual({ claims: 0, uncited: 0, rate: 0 });
  });

  it("returns rate 1 when every claim is uncited", () => {
    const claims = [
      { text: "a", quote: null },
      { text: "b", quote: "nothing like this appears anywhere" },
    ];
    expect(uncitedRate(claims, SOURCES).rate).toBe(1);
  });
});

describe("scoreGold", () => {
  const modelGaps: Gap[] = [
    gap({ id: "gap-1" }),
    gap({ id: "gap-2" }),
    gap({ id: "gap-3" }),
  ];

  it("computes precision/recall from filled-in verdicts", () => {
    const adjudication: GoldAdjudication = {
      gaps: [
        { id: "gap-1", jdQuote: "a", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "agree" },
        { id: "gap-2", jdQuote: "b", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "not_a_requirement" },
        { id: "gap-3", jdQuote: "c", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "agree" },
      ],
      missedRequirements: ["Terraform"],
    };
    const result = scoreGold(modelGaps, adjudication);
    // agree=2, total=3 reviewed -> precision 2/3; recall = 2/(2+1 missed) = 2/3
    expect(result).toEqual({ precision: 2 / 3, recall: 2 / 3, agree: 2, total: 3, missed: 1 });
  });

  it("ignores unreviewed entries (empty verdict) in both numerator and denominator", () => {
    const adjudication: GoldAdjudication = {
      gaps: [
        { id: "gap-1", jdQuote: "a", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "agree" },
        { id: "gap-2", jdQuote: "b", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "" },
        { id: "gap-3", jdQuote: "c", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "" },
      ],
      missedRequirements: [],
    };
    const result = scoreGold(modelGaps, adjudication);
    expect(result).toEqual({ precision: 1, recall: 1, agree: 1, total: 1, missed: 0 });
  });

  it("ignores an adjudication entry whose id no longer exists in modelGaps (stale file guard)", () => {
    const adjudication: GoldAdjudication = {
      gaps: [
        { id: "gap-1", jdQuote: "a", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "agree" },
        { id: "gap-999", jdQuote: "stale", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "agree" },
      ],
      missedRequirements: [],
    };
    const result = scoreGold(modelGaps, adjudication);
    expect(result).toEqual({ precision: 1, recall: 1, agree: 1, total: 1, missed: 0 });
  });

  it("treats wrong_kind:<kind> and not_a_requirement verdicts as reviewed-but-not-agree", () => {
    const adjudication: GoldAdjudication = {
      gaps: [
        { id: "gap-1", jdQuote: "a", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "wrong_kind:weak_evidence" },
        { id: "gap-2", jdQuote: "b", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "not_a_requirement" },
      ],
      missedRequirements: [],
    };
    const result = scoreGold(modelGaps, adjudication);
    expect(result.agree).toBe(0);
    expect(result.total).toBe(2);
    expect(result.precision).toBe(0);
  });

  it("returns null precision/recall (not zero) when there is nothing to score yet", () => {
    const adjudication: GoldAdjudication = { gaps: [], missedRequirements: [] };
    expect(scoreGold(modelGaps, adjudication)).toEqual({
      precision: null,
      recall: null,
      agree: 0,
      total: 0,
      missed: 0,
    });
  });

  it("returns null recall when agree and missed are both 0, even with reviewed entries", () => {
    const adjudication: GoldAdjudication = {
      gaps: [
        { id: "gap-1", jdQuote: "a", resumeQuote: null, kind: "missing_skill", rationale: "r", verdict: "not_a_requirement" },
      ],
      missedRequirements: [],
    };
    const result = scoreGold(modelGaps, adjudication);
    expect(result.precision).toBe(0);
    expect(result.recall).toBeNull();
  });

  it("counts missedRequirements even when zero gaps were reviewed", () => {
    const adjudication: GoldAdjudication = { gaps: [], missedRequirements: ["Airflow", "dbt"] };
    const result = scoreGold(modelGaps, adjudication);
    expect(result).toEqual({ precision: null, recall: 0, agree: 0, total: 0, missed: 2 });
  });
});

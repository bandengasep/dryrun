import { describe, it, expect } from "vitest";
import type OpenAI from "openai";
import { cosineTopK, diffGaps, DiffError, DiffWire } from "../src/diff";
import { Gap, type ParsedJD, type ParsedResume } from "../src/schemas";

/** Stub covering both stages: embeddings.create and responses.parse.
 * Captures request params so tests can pin the wiring, not just the mapping. */
function stubClient(
  vectors: number[][],
  parsed: unknown,
  captured: { embeddingInputs?: unknown } = {},
): OpenAI {
  return {
    embeddings: {
      create: async (params: { input: unknown }) => {
        captured.embeddingInputs = params.input;
        return {
          data: vectors.map((embedding, index) => ({ embedding, index })),
        };
      },
    },
    responses: {
      parse: async (_params: unknown) => ({ output_parsed: parsed }),
    },
  } as unknown as OpenAI;
}

// Two requirements, three resume lines. Vectors are crafted so req0 matches
// line0/line1 and req1 matches line2. Embedding call order: [reqs..., lines...].
const JD: ParsedJD = {
  sourceText: "Needs SQL. Needs dbt.",
  lines: [
    { id: "jd-1", text: "SQL", span: { start: 6, end: 9, text: "SQL" } },
    { id: "jd-2", text: "dbt", span: { start: 17, end: 20, text: "dbt" } },
  ],
  dropped: [],
};
const RESUME: ParsedResume = {
  sourceText: "Wrote SQL. Used spreadsheets. Modelled data.",
  lines: [
    { id: "cv-1", text: "Wrote SQL.", span: { start: 0, end: 10, text: "Wrote SQL." } },
    { id: "cv-2", text: "Used spreadsheets.", span: { start: 11, end: 29, text: "Used spreadsheets." } },
    { id: "cv-3", text: "Modelled data.", span: { start: 30, end: 44, text: "Modelled data." } },
  ],
  dropped: [],
};
const VECTORS = [
  [1, 0], // jd-1
  [0, 1], // jd-2
  [0.9, 0.1], // cv-1 — near jd-1
  [0.8, 0.2], // cv-2 — near jd-1
  [0.1, 0.9], // cv-3 — near jd-2
];

describe("cosineTopK — pure retrieval math", () => {
  it("ranks candidates by cosine similarity, descending", () => {
    expect(cosineTopK([1, 0], [[0.5, 0.5], [1, 0.01], [0, 1]], 2)).toEqual([1, 0]);
  });

  it("clamps k to the candidate count", () => {
    expect(cosineTopK([1, 0], [[1, 0]], 5)).toEqual([0]);
  });

  it("treats zero vectors as similarity 0 instead of NaN", () => {
    expect(cosineTopK([1, 0], [[0, 0], [1, 0]], 2)).toEqual([1, 0]);
  });

  it("returns [] for k <= 0 and for empty candidates (no slice(0,-1) surprises)", () => {
    expect(cosineTopK([1, 0], [[1, 0], [0, 1]], 0)).toEqual([]);
    expect(cosineTopK([1, 0], [[1, 0], [0, 1]], -1)).toEqual([]);
    expect(cosineTopK([1, 0], [], 3)).toEqual([]);
  });
});

describe("diffGaps — verdicts to receipts", () => {
  it("maps verdicts to Gaps whose receipts ARE the parsed lines' spans", async () => {
    const client = stubClient(VECTORS, {
      verdicts: [
        { requirementId: "jd-1", kind: "weak_evidence", resumeLineId: "cv-1", rationale: "mentions SQL, no depth" },
        { requirementId: "jd-2", kind: "missing_skill", resumeLineId: null, rationale: "no dbt anywhere" },
      ],
    });
    const gaps = await diffGaps(JD, RESUME, { client });
    expect(gaps.map((g) => g.id)).toEqual(["gap-1", "gap-2"]);
    for (const g of gaps) Gap.parse(g);
    expect(gaps[0].jdSpan).toEqual(JD.lines[0].span);
    expect(gaps[0].resumeSpan).toEqual(RESUME.lines[0].span);
    expect(gaps[1].resumeLineId).toBeNull();
    expect(gaps[1].resumeSpan).toBeNull();
  });

  it("coerces a missing_skill verdict that cites a line to a null receipt (dropping a citation never fabricates evidence)", async () => {
    const client = stubClient(VECTORS, {
      verdicts: [
        { requirementId: "jd-1", kind: "missing_skill", resumeLineId: "cv-1", rationale: "x" },
        { requirementId: "jd-2", kind: "missing_skill", resumeLineId: null, rationale: "y" },
      ],
    });
    const gaps = await diffGaps(JD, RESUME, { client });
    expect(gaps[0].resumeLineId).toBeNull();
    expect(gaps[0].resumeSpan).toBeNull();
  });

  it("throws DiffError when weak/strong evidence cites a nonexistent resume line (fabricated receipt)", async () => {
    const client = stubClient(VECTORS, {
      verdicts: [
        { requirementId: "jd-1", kind: "weak_evidence", resumeLineId: "cv-99", rationale: "x" },
        { requirementId: "jd-2", kind: "missing_skill", resumeLineId: null, rationale: "y" },
      ],
    });
    await expect(diffGaps(JD, RESUME, { client })).rejects.toThrow(DiffError);
  });

  it("throws DiffError when weak/strong evidence carries no citation at all", async () => {
    const client = stubClient(VECTORS, {
      verdicts: [
        { requirementId: "jd-1", kind: "strong_differentiator", resumeLineId: null, rationale: "x" },
        { requirementId: "jd-2", kind: "missing_skill", resumeLineId: null, rationale: "y" },
      ],
    });
    await expect(diffGaps(JD, RESUME, { client })).rejects.toThrow(DiffError);
  });

  it("throws DiffError when a requirement receives no verdict (coverage guard)", async () => {
    const client = stubClient(VECTORS, {
      verdicts: [
        { requirementId: "jd-1", kind: "weak_evidence", resumeLineId: "cv-1", rationale: "x" },
      ],
    });
    await expect(diffGaps(JD, RESUME, { client })).rejects.toThrow(DiffError);
  });

  it("throws DiffError on refusal (no structured output)", async () => {
    const client = stubClient(VECTORS, null);
    await expect(diffGaps(JD, RESUME, { client })).rejects.toThrow(DiffError);
  });

  it("returns [] for a JD with no requirement lines without calling the model", async () => {
    const empty: ParsedJD = { sourceText: "", lines: [], dropped: [] };
    const client = {} as unknown as OpenAI; // any call would throw
    expect(await diffGaps(empty, RESUME, { client })).toEqual([]);
  });

  it("sends embeddings input as [requirement texts..., resume line texts...] (stage-1 wiring pin)", async () => {
    const captured: { embeddingInputs?: unknown } = {};
    const client = stubClient(
      VECTORS,
      {
        verdicts: [
          { requirementId: "jd-1", kind: "missing_skill", resumeLineId: null, rationale: "" },
          { requirementId: "jd-2", kind: "missing_skill", resumeLineId: null, rationale: "" },
        ],
      },
      captured,
    );
    await diffGaps(JD, RESUME, { client });
    expect(captured.embeddingInputs).toEqual([
      "SQL",
      "dbt",
      "Wrote SQL.",
      "Used spreadsheets.",
      "Modelled data.",
    ]);
  });

  it("skips the embeddings call entirely for a zero-line resume and still adjudicates", async () => {
    const emptyResume: ParsedResume = { sourceText: "", lines: [], dropped: [] };
    const client = {
      // no embeddings property: any retrieval attempt would throw
      responses: {
        parse: async (_p: unknown) => ({
          output_parsed: {
            verdicts: [
              { requirementId: "jd-1", kind: "missing_skill", resumeLineId: null, rationale: "empty resume" },
              { requirementId: "jd-2", kind: "missing_skill", resumeLineId: null, rationale: "empty resume" },
            ],
          },
        }),
      },
    } as unknown as OpenAI;
    const gaps = await diffGaps(JD, emptyResume, { client });
    expect(gaps).toHaveLength(2);
    expect(gaps.every((g) => g.kind === "missing_skill" && g.resumeSpan === null)).toBe(true);
  });

  it("pins duplicate-verdict behavior: the model's last verdict for a requirement wins", async () => {
    const client = stubClient(VECTORS, {
      verdicts: [
        { requirementId: "jd-1", kind: "missing_skill", resumeLineId: null, rationale: "first" },
        { requirementId: "jd-1", kind: "weak_evidence", resumeLineId: "cv-1", rationale: "second" },
        { requirementId: "jd-2", kind: "missing_skill", resumeLineId: null, rationale: "y" },
      ],
    });
    const gaps = await diffGaps(JD, RESUME, { client });
    expect(gaps).toHaveLength(2); // extra verdicts never mint extra gaps
    expect(gaps[0].kind).toBe("weak_evidence");
    expect(gaps[0].rationale).toBe("second");
  });
});

describe("DiffWire — adjudication wire contract", () => {
  it("rejects an unknown kind", () => {
    expect(() =>
      DiffWire.parse({
        verdicts: [{ requirementId: "jd-1", kind: "sorta_matches", resumeLineId: null, rationale: "" }],
      }),
    ).toThrow();
  });
});

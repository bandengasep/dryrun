import { describe, it, expect } from "vitest";
import { DroppedLine, Gap, ParsedJD } from "../src/schemas";

describe("Gap — the shared receipts contract", () => {
  it("validates a well-formed gap that carries JD + resume receipts", () => {
    const g: Gap = {
      id: "gap-1",
      kind: "weak_evidence",
      requirementId: "jd-3",
      jdSpan: { start: 40, end: 62, text: "3+ years of SQL" },
      resumeLineId: "cv-7",
      resumeSpan: { start: 120, end: 138, text: "wrote some queries" },
      rationale: "Resume mentions queries but never quantifies years of SQL.",
    };
    expect(Gap.parse(g)).toEqual(g);
  });

  it("allows null resume receipts for a missing skill (the absence IS the evidence)", () => {
    const parsed = Gap.parse({
      id: "gap-2",
      kind: "missing_skill",
      requirementId: "jd-5",
      jdSpan: { start: 0, end: 7, text: "Airflow" },
      resumeLineId: null,
      resumeSpan: null,
      rationale: "No mention of Airflow anywhere in the resume.",
    });
    expect(parsed.resumeLineId).toBeNull();
    expect(parsed.resumeSpan).toBeNull();
  });

  it("rejects an unknown gap kind", () => {
    expect(() =>
      Gap.parse({
        id: "x",
        kind: "made_up_kind",
        requirementId: "j",
        jdSpan: { start: 0, end: 1, text: "a" },
        resumeLineId: null,
        resumeSpan: null,
        rationale: "",
      }),
    ).toThrow();
  });
});

describe("ParsedJD — parser output contract", () => {
  it("carries lines with receipts plus dropped quotes side by side", () => {
    const parsed = ParsedJD.parse({
      sourceText: "Requires 3+ years of SQL and dbt.",
      lines: [
        {
          id: "jd-1",
          text: "3+ years of SQL",
          span: { start: 9, end: 24, text: "3+ years of SQL" },
        },
      ],
      dropped: [
        { text: "dbt experience", quote: "dbt exp.", reason: "quote_not_found" },
      ],
    });
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.dropped[0].reason).toBe("quote_not_found");
  });

  it("rejects a dropped line with an unknown reason", () => {
    expect(() =>
      DroppedLine.parse({ text: "x", quote: "y", reason: "other" }),
    ).toThrow();
  });
});

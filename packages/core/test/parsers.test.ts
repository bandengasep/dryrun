import { describe, it, expect } from "vitest";
import type OpenAI from "openai";
import { parseJD, parseResume, ParserError } from "../src/parsers";
import { ParsedJD, ParsedResume } from "../src/schemas";

function stubClient(parsed: unknown): OpenAI {
  return {
    responses: { parse: async (_params: unknown) => ({ output_parsed: parsed }) },
  } as unknown as OpenAI;
}

const JD = "We need 3+ years of SQL and strong Python. Airflow is a plus.";

describe("parseJD — wire → domain with computed receipts", () => {
  it("maps quotes to located RequirementLines with sequential ids", async () => {
    const client = stubClient({
      requirements: [
        { requirement: "3+ years of SQL", quote: "3+ years of SQL" },
        { requirement: "Strong Python", quote: "strong Python" },
      ],
    });
    const parsed = await parseJD(JD, { client });
    ParsedJD.parse(parsed); // validates against the shared contract
    expect(parsed.lines.map((l) => l.id)).toEqual(["jd-1", "jd-2"]);
    for (const line of parsed.lines) {
      expect(JD.slice(line.span.start, line.span.end)).toBe(line.span.text);
    }
  });

  it("routes unlocatable quotes to dropped — never silently discarded", async () => {
    const client = stubClient({
      requirements: [
        { requirement: "Kubernetes", quote: "K8s experience required" },
      ],
    });
    const parsed = await parseJD(JD, { client });
    expect(parsed.lines).toHaveLength(0);
    expect(parsed.dropped).toEqual([
      {
        text: "Kubernetes",
        quote: "K8s experience required",
        reason: "quote_not_found",
      },
    ]);
  });

  it("throws ParserError when the model refuses (no structured output)", async () => {
    await expect(parseJD(JD, { client: stubClient(null) })).rejects.toThrow(
      ParserError,
    );
  });

  it("pins duplicate-quote behavior: distinct ids, identical first-occurrence spans", async () => {
    const client = stubClient({
      requirements: [
        { requirement: "SQL fluency", quote: "3+ years of SQL" },
        { requirement: "SQL experience", quote: "3+ years of SQL" },
      ],
    });
    const parsed = await parseJD(JD, { client });
    expect(parsed.lines.map((l) => l.id)).toEqual(["jd-1", "jd-2"]);
    expect(parsed.lines[0].span).toEqual(parsed.lines[1].span);
    expect(parsed.dropped).toHaveLength(0);
  });
});

describe("parseResume — same family, cv- ids", () => {
  it("maps verbatim resume lines with receipts", async () => {
    const RESUME = "Wrote SQL in BigQuery.\nCleaned data with pandas.";
    const client = stubClient({
      lines: [
        { quote: "Wrote SQL in BigQuery." },
        { quote: "Cleaned data with pandas." },
      ],
    });
    const parsed = await parseResume(RESUME, { client });
    ParsedResume.parse(parsed);
    expect(parsed.lines.map((l) => l.id)).toEqual(["cv-1", "cv-2"]);
    expect(parsed.lines[1].text).toBe("Cleaned data with pandas.");
  });

  it("routes unlocatable resume quotes to dropped (text = quote for resumes)", async () => {
    const RESUME = "Wrote SQL in BigQuery.";
    const client = stubClient({
      lines: [
        { quote: "Wrote SQL in BigQuery." },
        { quote: "Shipped Kubernetes operators." },
      ],
    });
    const parsed = await parseResume(RESUME, { client });
    ParsedResume.parse(parsed); // round-trip with populated dropped
    expect(parsed.lines.map((l) => l.id)).toEqual(["cv-1"]);
    expect(parsed.dropped).toEqual([
      {
        text: "Shipped Kubernetes operators.",
        quote: "Shipped Kubernetes operators.",
        reason: "quote_not_found",
      },
    ]);
  });

  it("throws ParserError when the model refuses a resume parse", async () => {
    await expect(
      parseResume("resume text", { client: stubClient(null) }),
    ).rejects.toThrow(ParserError);
  });
});

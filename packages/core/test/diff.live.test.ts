import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import OpenAI from "openai";
import { parseJD, parseResume } from "../src/parsers";
import { diffGaps } from "../src/diff";
import { Gap, type ParsedJD, type ParsedResume } from "../src/schemas";

const hasKey = Boolean(process.env.OPENAI_API_KEY);
const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, "fixtures", name), "utf8");

async function compilePair(client: OpenAI, n: string) {
  const jdText = fixture(`jd-${n}.txt`);
  const resumeText = fixture(`resume-${n}.txt`);
  const [jd, resume] = await Promise.all([
    parseJD(jdText, { client }),
    parseResume(resumeText, { client }),
  ]);
  const gaps = await diffGaps(jd, resume, { client });
  return { jd, resume, gaps };
}

/** The receipts invariant, end to end: every span is a literal slice of its source. */
function assertReceipts(jd: ParsedJD, resume: ParsedResume, gaps: Gap[]) {
  expect(gaps.length).toBe(jd.lines.length); // one verdict per requirement
  for (const g of gaps) {
    Gap.parse(g);
    expect(jd.sourceText.slice(g.jdSpan.start, g.jdSpan.end)).toBe(g.jdSpan.text);
    if (g.resumeSpan) {
      expect(resume.sourceText.slice(g.resumeSpan.start, g.resumeSpan.end)).toBe(
        g.resumeSpan.text,
      );
    }
    // Kind ↔ receipt consistency is structural, not model-trusted.
    if (g.kind === "missing_skill") expect(g.resumeLineId).toBeNull();
    else expect(g.resumeLineId).not.toBeNull();
  }
}

const kinds = (gaps: Gap[], kind: Gap["kind"]) => gaps.filter((g) => g.kind === kind);

describe.skipIf(!hasKey)(
  "diff — live smoke on 3 hand-built pairs (needs OPENAI_API_KEY; auto-skips in CI)",
  () => {
    it("pair 1 (moderate match): receipts hold; dbt is missing; SQL is not missing", { timeout: 240_000 }, async () => {
      const client = new OpenAI();
      const { jd, resume, gaps } = await compilePair(client, "01");
      assertReceipts(jd, resume, gaps);
      // dbt appears only in the JD — planted missing_skill anchor.
      const dbtGaps = gaps.filter((g) => /dbt/i.test(g.jdSpan.text));
      expect(dbtGaps.length).toBeGreaterThanOrEqual(1);
      expect(kinds(dbtGaps, "missing_skill").length).toBeGreaterThanOrEqual(1);
      // SQL is evidenced (weak or strong) — it must not read as absent.
      const sqlGaps = gaps.filter((g) => /\bSQL\b/.test(g.jdSpan.text));
      expect(sqlGaps.length).toBeGreaterThanOrEqual(1);
      expect(sqlGaps.some((g) => g.kind !== "missing_skill")).toBe(true);
    });

    it("pair 2 (poor match): mostly missing; Terraform is missing; no strong differentiators", { timeout: 240_000 }, async () => {
      const client = new OpenAI();
      const { jd, resume, gaps } = await compilePair(client, "02");
      assertReceipts(jd, resume, gaps);
      const missing = kinds(gaps, "missing_skill");
      expect(missing.length).toBeGreaterThanOrEqual(4); // manifest plants >=5; allow one adjudication wobble
      const terraform = gaps.filter((g) => /terraform/i.test(g.jdSpan.text));
      expect(terraform.length).toBeGreaterThanOrEqual(1);
      expect(kinds(terraform, "missing_skill").length).toBe(terraform.length);
      expect(kinds(gaps, "strong_differentiator").length).toBe(0);
    });

    it("pair 3 (strong match): has strong differentiators; Airflow is missing", { timeout: 240_000 }, async () => {
      const client = new OpenAI();
      const { jd, resume, gaps } = await compilePair(client, "03");
      assertReceipts(jd, resume, gaps);
      expect(kinds(gaps, "strong_differentiator").length).toBeGreaterThanOrEqual(1); // manifest plants >=2; allow wobble
      const airflow = gaps.filter((g) => /airflow/i.test(g.jdSpan.text));
      expect(airflow.length).toBeGreaterThanOrEqual(1);
      expect(kinds(airflow, "missing_skill").length).toBeGreaterThanOrEqual(1);
    });
  },
);

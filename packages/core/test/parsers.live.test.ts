import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import OpenAI from "openai";
import { parseJD, parseResume } from "../src/parsers";

const hasKey = Boolean(process.env.OPENAI_API_KEY);
const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, "fixtures", name), "utf8");

describe.skipIf(!hasKey)(
  "parsers — live smoke (needs OPENAI_API_KEY; auto-skips in CI)",
  () => {
    it(
      "JD fixture → located, receipt-true requirement lines",
      { timeout: 120_000 },
      async () => {
        const client = new OpenAI();
        const jd = fixture("jd-01.txt");
        const parsed = await parseJD(jd, { client });
        expect(parsed.lines.length).toBeGreaterThanOrEqual(5);
        for (const line of parsed.lines) {
          expect(jd.slice(line.span.start, line.span.end)).toBe(line.span.text);
        }
        const total = parsed.lines.length + parsed.dropped.length;
        expect(parsed.lines.length / total).toBeGreaterThanOrEqual(0.8);
      },
    );

    it(
      "resume fixture → located, receipt-true evidence lines",
      { timeout: 120_000 },
      async () => {
        const client = new OpenAI();
        const resume = fixture("resume-01.txt");
        const parsed = await parseResume(resume, { client });
        expect(parsed.lines.length).toBeGreaterThanOrEqual(5);
        for (const line of parsed.lines) {
          expect(resume.slice(line.span.start, line.span.end)).toBe(
            line.span.text,
          );
        }
        const total = parsed.lines.length + parsed.dropped.length;
        expect(parsed.lines.length / total).toBeGreaterThanOrEqual(0.8);
      },
    );
  },
);

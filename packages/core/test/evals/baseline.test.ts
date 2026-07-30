// The zero-shot ChatGPT baseline: no structured-output contract, no
// receipts-by-construction — the comparison target the eval numbers are
// judged against. Asks gpt-5-mini in plain prose for questions + evidence
// quotes, parses that prose LENIENTLY (documented below), then measures how
// many of ITS OWN quotes actually locate in the source documents via the same
// locateSpan the parsers/debrief use. RUN_EVALS-gated.
import { describe, it, expect } from "vitest";
import OpenAI from "openai";
import { uncitedRate } from "../../src/evals";
import { locateSpan } from "../../src/parsers/spans";
import { evalsEnabled, loadPairs, writeResult } from "./harness";

const BASELINE_MODEL = "gpt-5-mini";

const BASELINE_PROMPT = [
  "You are helping a candidate prepare for a job interview.",
  "Given the job description and the candidate's resume below, list the interview questions they should expect.",
  "For each question, give a short quote of evidence from the JD or resume that motivates it.",
  "",
  "Format each item EXACTLY as two lines, one item per pair, nothing else before or after:",
  "Q: <the question>",
  'Quote: <the exact quote from the JD or resume, or "none" if there is not one>',
].join("\n");

interface BaselineItem {
  question: string;
  quote: string | null;
}

// Raw model text and per-item verdicts are persisted so the headline rate can
// be audited post-hoc: a 3-char quote that locates trivially and a full
// requirement line score the same in uncitedRate, and only the persisted
// items can tell them apart. qLines vs itemsParsed exposes how many Q-lines
// the lenient parser dropped (a Q with no parseable Quote line vanishes).
interface BaselinePairResult {
  n: string;
  itemsParsed: number;
  qLines: number;
  uncited: ReturnType<typeof uncitedRate>;
  items: { question: string; quote: string | null; located: boolean; quoteChars: number | null }[];
  raw: string;
}

/**
 * Deliberately lenient: the baseline has no structured-output contract (that
 * IS the comparison — our compiler enforces receipts by construction, the
 * baseline does not), so it gets the benefit of the doubt on formatting.
 * Accepts "Q:"/"Question:" and "Quote:" line prefixes (case-insensitive, a
 * few separator punctuation variants), strips surrounding quote marks, and
 * treats a literal "none" as no quote. Anything that doesn't match this
 * loose shape is simply not counted as an item — not treated as a citation
 * failure, since it was never a claim with a quote to begin with.
 */
function parseBaseline(text: string): BaselineItem[] {
  const items: BaselineItem[] = [];
  let pendingQuestion: string | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const qMatch = /^Q(?:uestion)?\s*[:.\-]\s*(.+)$/i.exec(line);
    const quoteMatch = /^Quote\s*[:.\-]\s*(.+)$/i.exec(line);
    if (qMatch) {
      pendingQuestion = qMatch[1].trim();
    } else if (quoteMatch && pendingQuestion) {
      const rawQuote = quoteMatch[1].trim().replace(/^["“]|["”]$/g, "").replace(/["”]$/g, "");
      items.push({
        question: pendingQuestion,
        quote: /^none$/i.test(rawQuote) ? null : rawQuote,
      });
      pendingQuestion = null;
    }
  }
  return items;
}

describe.skipIf(!evalsEnabled)("baseline — zero-shot ChatGPT, no receipts contract", () => {
  it(
    "asks gpt-5-mini for questions+quotes with no structured-output guard, measures how many quotes are real",
    { timeout: 5 * 60_000 },
    async () => {
      const client = new OpenAI();
      const pairs = loadPairs();
      expect(pairs.length).toBeGreaterThan(0);

      const perPair: BaselinePairResult[] = [];

      for (const pair of pairs) {
        const response = await client.chat.completions.create({
          model: BASELINE_MODEL,
          messages: [
            { role: "system", content: BASELINE_PROMPT },
            {
              role: "user",
              content: `JOB DESCRIPTION:\n${pair.jdText}\n\nRESUME:\n${pair.resumeText}`,
            },
          ],
        });
        const text = response.choices[0]?.message?.content ?? "";
        const items = parseBaseline(text);
        const qLines = text
          .split("\n")
          .filter((l) => /^Q(?:uestion)?\s*[:.\-]/i.test(l.trim())).length;
        const sources = [pair.jdText, pair.resumeText];
        const detailed = items.map((i) => ({
          question: i.question,
          quote: i.quote,
          located: i.quote !== null && sources.some((s) => locateSpan(s, i.quote as string) !== null),
          quoteChars: i.quote === null ? null : i.quote.length,
        }));
        const claims = items.map((i) => ({ text: i.question, quote: i.quote }));
        const stats = uncitedRate(claims, sources);
        perPair.push({ n: pair.n, itemsParsed: items.length, qLines, uncited: stats, items: detailed, raw: text });
        console.log(
          `[baseline] pair-${pair.n}: parsed ${items.length}/${qLines} Q-lines, uncitedRate=${stats.rate.toFixed(2)}`,
        );
      }

      const totalClaims = perPair.reduce((s, p) => s + p.uncited.claims, 0);
      const totalUncited = perPair.reduce((s, p) => s + p.uncited.uncited, 0);
      const aggregateUncitedRate = totalClaims === 0 ? null : totalUncited / totalClaims;

      const quoted = perPair.flatMap((p) => p.items.filter((i) => i.quoteChars !== null));
      const lens = quoted.map((i) => i.quoteChars as number).sort((a, b) => a - b);
      const medianQuoteChars = lens.length === 0 ? null : lens[Math.floor(lens.length / 2)];
      const shortQuoteRate =
        quoted.length === 0 ? null : quoted.filter((i) => (i.quoteChars as number) < 20).length / quoted.length;
      const noneCount = perPair.reduce((s, p) => s + p.items.filter((i) => i.quote === null).length, 0);

      await writeResult(
        "baseline",
        {
          corpus: pairs.map((p) => p.n),
          config: {
            model: BASELINE_MODEL,
            note: "leniently-parsed free text, no structured-output contract; raw outputs + per-item verdicts persisted for audit",
          },
          metrics: { aggregateUncitedRate, medianQuoteChars, shortQuoteRate, noneCount },
          perPair,
        },
        { baseline_uncited_rate: aggregateUncitedRate, baseline_median_quote_chars: medianQuoteChars },
      );

      expect(perPair.length).toBeGreaterThan(0);
    },
  );
});

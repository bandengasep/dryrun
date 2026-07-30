// Generates one human-readable review sheet per gold pair into
// test/gold/review/pair-NN.review.md — a READING AID for hand adjudication,
// nothing more. It mechanically re-presents committed data (adjudication
// entries + fixture texts) with each quote shown in its surrounding context,
// and appends a JD coverage map (which JD lines are already cited by some
// gap) so the missedRequirements sweep only needs to scan the unmarked
// lines. It contains NO judgments, NO ordering changes, NO suggestions —
// gold stays human-adjudicated (decision-log 2026-07-30).
//
// Verdicts still go in pair-NN.adjudication.json. Re-run after editing them
// to refresh the "verdict so far" column:
//   cd packages/core && npx tsx test/gold/generate-review-sheets.mts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { locateSpan } from "../../src/parsers/spans.ts";
import type { GoldAdjudication } from "../../src/evals/index.ts";

const GOLD_DIR = import.meta.dirname;
const FIXTURES_DIR = resolve(GOLD_DIR, "../fixtures");
const REVIEW_DIR = resolve(GOLD_DIR, "review");

const CONTEXT_CHARS = 110;

/** The quote bolded inside ±CONTEXT_CHARS of its source, newlines flattened. */
function inContext(source: string, quote: string | null): string {
  if (quote === null) return "_(resume silent — no quote)_";
  const span = locateSpan(source, quote);
  if (!span) return `⚠ UNLOCATABLE QUOTE (broken receipt — flag it): "${quote}"`;
  const before = source.slice(Math.max(0, span.start - CONTEXT_CHARS), span.start);
  const after = source.slice(span.end, span.end + CONTEXT_CHARS);
  const flat = (s: string) => s.replace(/\s+/g, " ").trim();
  return `…${flat(before)} **${flat(span.text)}** ${flat(after)}…`;
}

/** Each JD line prefixed ✓ (cited by ≥1 gap) or · (cited by none). */
function coverageMap(jdText: string, adjudication: GoldAdjudication): string {
  const spans = adjudication.gaps
    .map((g) => locateSpan(jdText, g.jdQuote))
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const lines = jdText.split("\n");
  let offset = 0;
  const out: string[] = [];
  for (const line of lines) {
    const start = offset;
    const end = offset + line.length;
    offset = end + 1;
    if (line.trim().length === 0) {
      out.push("");
      continue;
    }
    const cited = spans.some((s) => s.start < end && s.end > start);
    out.push(`${cited ? "✓" : "·"} ${line}`);
  }
  return out.join("\n");
}

const pairNs = readdirSync(GOLD_DIR)
  .map((f) => /^pair-(\d+)\.adjudication\.json$/.exec(f)?.[1])
  .filter((n): n is string => n !== undefined)
  .sort();

mkdirSync(REVIEW_DIR, { recursive: true });

for (const n of pairNs) {
  const adjudication = JSON.parse(
    readFileSync(resolve(GOLD_DIR, `pair-${n}.adjudication.json`), "utf8"),
  ) as GoldAdjudication;
  const jdText = readFileSync(resolve(FIXTURES_DIR, `jd-${n}.txt`), "utf8");
  const resumeText = readFileSync(resolve(FIXTURES_DIR, `resume-${n}.txt`), "utf8");

  const filled = adjudication.gaps.filter((g) => g.verdict.trim().length > 0).length;
  const parts: string[] = [
    `# Pair ${n} — adjudication review sheet (${adjudication.gaps.length} gaps, ${filled} adjudicated)`,
    "",
    `> **Sources:** JD = \`test/fixtures/jd-${n}.txt\` · Resume = \`test/fixtures/resume-${n}.txt\``,
    `> Verdicts go in \`test/gold/pair-${n}.adjudication.json\``,
    ">",
    "> GENERATED READING AID — mechanical re-presentation of pair-" + n + ".adjudication.json",
    "> plus fixture context. No judgments live here; verdicts go in the JSON.",
    ">",
    "> Verdicts: `agree` · `wrong_kind:<missing_skill|weak_evidence|strong_differentiator>` · `not_a_requirement`",
    "> Then sweep the `·` lines of the coverage map at the bottom: any requirement the",
    "> engine never surfaced goes into `missedRequirements[]` as a verbatim JD quote.",
    "",
  ];

  for (const g of adjudication.gaps) {
    parts.push(
      `---`,
      ``,
      `### ${g.id} · \`${g.kind}\` · verdict so far: ${g.verdict.trim() ? `\`${g.verdict}\`` : "_(none)_"}`,
      ``,
      `**JD:** ${inContext(jdText, g.jdQuote)}`,
      ``,
      `**Resume:** ${inContext(resumeText, g.resumeQuote)}`,
      ``,
      `**Engine's rationale:** ${g.rationale}`,
      ``,
    );
  }

  parts.push(
    `---`,
    ``,
    `## JD coverage map — sweep the \`·\` lines for missedRequirements`,
    ``,
    "```",
    coverageMap(jdText, adjudication),
    "```",
    "",
  );

  const outPath = resolve(REVIEW_DIR, `pair-${n}.review.md`);
  writeFileSync(outPath, parts.join("\n"), "utf8");
  console.log(`[review-sheets] wrote ${outPath} (${adjudication.gaps.length} gaps)`);
}

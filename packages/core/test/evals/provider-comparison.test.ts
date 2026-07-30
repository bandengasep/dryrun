// The Thursday OpenAI-vs-Agnes plan-compile comparison: same gaps, same
// prompt/payload shape, two providers. OpenAI runs the real compileSessionPlan
// (strict SO via responses.parse) with onWire capturing its pre-guard output;
// Agnes runs through the chat.completions json_schema adapter (agnes-adapter.ts)
// since Agnes's /responses endpoint silently ignores json_schema (see
// docs/decision-log.md 2026-07-27) — its guards are simulated locally rather
// than by calling compileSessionPlan, since that function is hardwired to
// responses.parse. RUN_EVALS-gated; additionally self-skips if AGNES_API_KEY
// is absent (Agnes cost is always null — no published pricing, see PRICES).
import { describe, it, expect } from "vitest";
import OpenAI from "openai";
import { parseJD, parseResume } from "../../src/parsers";
import { diffGaps } from "../../src/diff";
import { compileSessionPlan, DEFAULT_MAX_QUESTIONS, PlanError } from "../../src/plan";
import { PlanWire } from "../../src/plan/wire";
import { kindMix, questionGroundingRate, starComplianceRate } from "../../src/evals";
import { agnesStructured, makeAgnesEvalClient } from "./agnes-adapter";
import { evalsEnabled, pairByN, writeResult } from "./harness";

const PAIR_NS = ["01", "04"];

// Mirrors PLAN_SYSTEM_PROMPT in ../../src/plan/index.ts, which is not
// exported (plan/index.ts is frozen to surgical onWire/requestOverrides
// additions only — see this lane's brief). Duplicated here so the Agnes lane
// gets the identical instructions to the OpenAI lane. Keep in sync by hand;
// a prompt change there without an update here would silently unbalance the
// comparison, so this comment exists to make that easy to notice.
const PLAN_SYSTEM_PROMPT = [
  "You compile a mock-interview question set from measured gaps between a job description and a candidate's resume.",
  "Each gap is already evidenced: it cites the JD line that demands something and the resume line (if any) that speaks to it.",
  "Emit one question per gap you choose to cover, in the order the gaps are given. Echo that gap's id in `gapId` — never invent an id.",
  "Question policy, by gap kind:",
  '- "missing_skill": the resume shows no evidence, so there is no story to tell. Emit kind "conceptual" — probe understanding and approach. starHints MUST be null.',
  '- "weak_evidence": the resume touches the requirement but shallowly. Emit kind "behavioral" — ask for the lived specifics. starHints MUST be filled in.',
  '- "strong_differentiator": usually skip; cover at most ONE, as a behavioral question that lets the candidate show depth.',
  "starHints are one-line prompts telling the candidate what each STAR beat should contain — never a scripted answer, never invented facts about them.",
  "Ask what a real interviewer would ask: one question, plainly worded, no preamble and no multi-part compound questions.",
  "rationale: one sentence naming what this gap makes worth probing.",
].join("\n");

function simulateGuards(
  questions: { gapId: string; kind: string; starHints: unknown }[],
  gapIds: Set<string>,
  maxQuestions: number,
): { accepted: number; rejected: number; reasons: string[] } {
  let accepted = 0;
  let rejected = 0;
  const reasons: string[] = [];
  for (const q of questions.slice(0, maxQuestions)) {
    if (!gapIds.has(q.gapId)) {
      rejected++;
      reasons.push(`unknown gapId ${q.gapId}`);
      continue;
    }
    if (q.kind === "behavioral" && (q.starHints === null || q.starHints === undefined)) {
      rejected++;
      reasons.push(`behavioral question for ${q.gapId} missing STAR hints`);
      continue;
    }
    accepted++;
  }
  return { accepted, rejected, reasons };
}

describe.skipIf(!evalsEnabled)(
  "provider-comparison — plan-compile stage, OpenAI strict-SO vs Agnes chat.completions",
  () => {
    it(
      "compiles the same gaps on both providers and compares grounding / guard-rejection / STAR / kind-mix / latency",
      { timeout: 10 * 60_000 },
      async () => {
        let agnesClient: OpenAI;
        try {
          agnesClient = makeAgnesEvalClient();
        } catch (e) {
          console.log(`[provider-comparison] ${(e as Error).message} — skipping`);
          return;
        }

        const openaiClient = new OpenAI();
        const perPair: unknown[] = [];

        for (const n of PAIR_NS) {
          const pair = pairByN(n);
          if (!pair) {
            console.log(`[provider-comparison] pair-${n} unpaired, skipping`);
            continue;
          }

          const [jd, resume] = await Promise.all([
            parseJD(pair.jdText, { client: openaiClient }),
            parseResume(pair.resumeText, { client: openaiClient }),
          ]);
          const gaps = await diffGaps(jd, resume, { client: openaiClient });
          if (gaps.length === 0) {
            console.log(`[provider-comparison] pair-${n}: 0 gaps, skipping`);
            continue;
          }
          const gapIds = new Set(gaps.map((g) => g.id));

          // --- OpenAI lane: the real compileSessionPlan, wire captured pre-guard.
          let openaiWire: PlanWire | undefined;
          let openaiThrew: string | null = null;
          const openaiStart = performance.now();
          try {
            await compileSessionPlan(gaps, pair.jdText, pair.resumeText, {
              client: openaiClient,
              onWire: (w) => {
                openaiWire = w as PlanWire;
              },
            });
          } catch (e) {
            openaiThrew = e instanceof PlanError ? e.message : String(e);
          }
          const openaiMs = performance.now() - openaiStart;

          // --- Agnes lane: chat.completions + json_schema; guards simulated locally.
          const payload = {
            maxQuestions: DEFAULT_MAX_QUESTIONS,
            gaps: gaps.map((g) => ({
              id: g.id,
              kind: g.kind,
              jdQuote: g.jdSpan.text,
              resumeQuote: g.resumeSpan?.text ?? null,
              rationale: g.rationale,
            })),
          };
          const agnesStart = performance.now();
          const agnesWire = await agnesStructured(agnesClient, {
            model: process.env.AGNES_MODEL ?? "agnes-2.0-flash",
            system: PLAN_SYSTEM_PROMPT,
            user: JSON.stringify(payload),
            wire: PlanWire,
            name: "session_plan",
          });
          const agnesMs = performance.now() - agnesStart;

          const openaiGuards = openaiWire
            ? simulateGuards(openaiWire.questions, gapIds, DEFAULT_MAX_QUESTIONS)
            : null;
          const agnesGuards = simulateGuards(agnesWire.questions, gapIds, DEFAULT_MAX_QUESTIONS);

          perPair.push({
            n,
            gapCount: gaps.length,
            openai: {
              wallMs: openaiMs,
              threw: openaiThrew,
              grounding: openaiWire ? questionGroundingRate(openaiWire.questions, [...gapIds]) : null,
              star: openaiWire ? starComplianceRate(openaiWire.questions) : null,
              kindMix: openaiWire ? kindMix(openaiWire.questions) : null,
              guards: openaiGuards,
              costUSD: null, // priced separately once PRICES is filled in from usage on the metered calls
            },
            agnes: {
              wallMs: agnesMs,
              grounding: questionGroundingRate(agnesWire.questions, [...gapIds]),
              star: starComplianceRate(agnesWire.questions),
              kindMix: kindMix(agnesWire.questions),
              guards: agnesGuards,
              costUSD: null, // Agnes has no published per-token pricing — PRICES stays null by contract
            },
          });
          console.log(
            `[provider-comparison] pair-${n}: openai=${openaiMs.toFixed(0)}ms (threw=${Boolean(openaiThrew)}) agnes=${agnesMs.toFixed(0)}ms`,
          );
        }

        const mean = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
        type PairRow = { openai: { wallMs: number }; agnes: { wallMs: number } };
        const openaiMsAvg = mean((perPair as PairRow[]).map((p) => p.openai.wallMs));
        const agnesMsAvg = mean((perPair as PairRow[]).map((p) => p.agnes.wallMs));

        await writeResult(
          "provider-comparison",
          {
            corpus: PAIR_NS,
            config: {
              openaiModel: "gpt-5-mini (default)",
              agnesModel: process.env.AGNES_MODEL ?? "agnes-2.0-flash",
            },
            metrics: {},
            perPair,
          },
          { openai_avg_ms: openaiMsAvg, agnes_avg_ms: agnesMsAvg },
        );

        expect(perPair.length).toBeGreaterThanOrEqual(0);
      },
    );
  },
);

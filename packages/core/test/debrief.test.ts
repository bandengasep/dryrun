import { describe, it, expect } from "vitest";
import type OpenAI from "openai";
import { compileDebrief, DebriefError, DebriefWire, NOT_ATTEMPTED_SUMMARY } from "../src/debrief";
import { joinTimedWords } from "../src/debrief/timeline";
import {
  DebriefReport,
  type Gap,
  type SessionPlan,
  type TimedWord,
  type TranscriptTurn,
} from "../src/schemas";

function stubClient(parsed: unknown, captured: { payload?: unknown } = {}): OpenAI {
  return {
    responses: {
      parse: async (params: { input: { role: string; content: string }[] }) => {
        const user = params.input.find((m) => m.role === "user");
        captured.payload = user ? JSON.parse(user.content) : null;
        return { output_parsed: parsed };
      },
    },
  } as unknown as OpenAI;
}

const GAPS: Gap[] = [
  {
    id: "gap-1",
    kind: "weak_evidence",
    requirementId: "jd-1",
    jdSpan: { start: 0, end: 15, text: "3+ years of SQL" },
    resumeLineId: "cv-1",
    resumeSpan: { start: 0, end: 10, text: "Wrote SQL." },
    rationale: "SQL claimed but unquantified.",
  },
  {
    id: "gap-2",
    kind: "missing_skill",
    requirementId: "jd-2",
    jdSpan: { start: 20, end: 27, text: "Airflow" },
    resumeLineId: null,
    resumeSpan: null,
    rationale: "No orchestration anywhere.",
  },
];

const PLAN: SessionPlan = {
  id: "plan-1",
  createdAt: "2026-07-28T09:00:00.000Z",
  jdText: "3+ years of SQL. Airflow.",
  resumeText: "Wrote SQL.",
  gaps: GAPS,
  questions: [
    {
      id: "q-1",
      kind: "behavioral",
      gapId: "gap-1",
      question: "Tell me about the most complex SQL you have written.",
      starHints: { situation: "s", task: "t", action: "a", result: "r" },
      rationale: "depth unproven",
    },
    {
      id: "q-2",
      kind: "conceptual",
      gapId: "gap-2",
      question: "How would you schedule a retrying daily job?",
      starHints: null,
      rationale: "absent from resume",
    },
  ],
};

const ANSWER_1 = "I built a funnel model in BigQuery using window functions.";

const turn = (
  role: "interviewer" | "candidate",
  text: string,
  questionId: string | null,
): TranscriptTurn => ({ role, questionId, text, mode: "text", videoId: null, timedWords: null });

/** q-1 answered, q-2 asked but never answered. */
const TRANSCRIPT: TranscriptTurn[] = [
  turn("interviewer", "Tell me about the most complex SQL you have written.", "q-1"),
  turn("candidate", ANSWER_1, "q-1"),
  turn("interviewer", "How would you schedule a retrying daily job?", "q-2"),
];

const GOOD_WIRE = {
  questions: [
    {
      questionId: "q-1",
      summary: "Named a concrete project and the SQL feature used.",
      covered: [
        { claim: "Named the warehouse", quote: "BigQuery" },
        { claim: "Named a specific technique", quote: "window functions" },
      ],
      missed: [{ claim: "Never said how long they have worked with SQL" }],
    },
  ],
};

describe("compileDebrief — every displayed claim quotes the candidate", () => {
  it("locates each covered quote inside the candidate's own turn", async () => {
    const report = await compileDebrief(PLAN, TRANSCRIPT, { client: stubClient(GOOD_WIRE) });
    expect(() => DebriefReport.parse(report)).not.toThrow();

    const q1 = report.perQuestion.find((q) => q.questionId === "q-1")!;
    expect(q1.covered).toHaveLength(2);
    for (const point of q1.covered) {
      const source = TRANSCRIPT[point.quote.turnIndex].text;
      // The receipts invariant, identical to the JD/resume one.
      expect(source.slice(point.quote.span.start, point.quote.span.end)).toBe(point.quote.span.text);
    }
  });

  it("copies gapId from the plan, so the model cannot re-home a receipt", async () => {
    const wire = {
      questions: [{ ...GOOD_WIRE.questions[0], gapId: "gap-999" }],
    };
    const report = await compileDebrief(PLAN, TRANSCRIPT, { client: stubClient(wire) });
    expect(report.perQuestion.find((q) => q.questionId === "q-1")!.gapId).toBe("gap-1");
  });

  it("demotes an unlocatable quote to dropped instead of displaying it", async () => {
    const wire = {
      questions: [
        {
          questionId: "q-1",
          summary: "s",
          covered: [
            { claim: "Named the warehouse", quote: "BigQuery" },
            { claim: "Claimed ten years", quote: "I have ten years of experience" },
          ],
          missed: [],
        },
      ],
    };
    const report = await compileDebrief(PLAN, TRANSCRIPT, { client: stubClient(wire) });
    const q1 = report.perQuestion.find((q) => q.questionId === "q-1")!;
    expect(q1.covered.map((c) => c.claim)).toEqual(["Named the warehouse"]);
    expect(report.dropped).toHaveLength(1);
    expect(report.dropped[0]).toMatchObject({
      questionId: "q-1",
      claim: "Claimed ten years",
      reason: "quote_not_found",
    });
  });

  it("marks a question the candidate never answered as not attempted, without asking the model", async () => {
    const captured: { payload?: unknown } = {};
    const report = await compileDebrief(PLAN, TRANSCRIPT, {
      client: stubClient(GOOD_WIRE, captured),
    });
    const q2 = report.perQuestion.find((q) => q.questionId === "q-2")!;
    expect(q2.attempted).toBe(false);
    expect(q2.covered).toEqual([]);
    expect(q2.missed).toEqual([]);
    expect(q2.summary).toBe(NOT_ATTEMPTED_SUMMARY);

    // Unanswered questions must not be sent for coverage analysis — there is
    // nothing to analyse and inviting a verdict invites invention.
    const payload = captured.payload as { questions: { questionId: string }[] };
    expect(payload.questions.map((q) => q.questionId)).toEqual(["q-1"]);
  });

  it("keeps plan order in perQuestion regardless of the model's ordering", async () => {
    const report = await compileDebrief(PLAN, TRANSCRIPT, { client: stubClient(GOOD_WIRE) });
    expect(report.perQuestion.map((q) => q.questionId)).toEqual(["q-1", "q-2"]);
  });

  it("carries missed points with no quote attached (you cannot quote an absence)", async () => {
    const report = await compileDebrief(PLAN, TRANSCRIPT, { client: stubClient(GOOD_WIRE) });
    const q1 = report.perQuestion.find((q) => q.questionId === "q-1")!;
    expect(q1.missed).toEqual([
      { claim: "Never said how long they have worked with SQL" },
    ]);
  });

  it("throws DebriefError when the model debriefs a question that is not in the plan", async () => {
    const wire = { questions: [{ ...GOOD_WIRE.questions[0], questionId: "q-99" }] };
    await expect(
      compileDebrief(PLAN, TRANSCRIPT, { client: stubClient(wire) }),
    ).rejects.toThrow(DebriefError);
  });

  it("throws DebriefError when an answered question gets no debrief (coverage hole)", async () => {
    await expect(
      compileDebrief(PLAN, TRANSCRIPT, { client: stubClient({ questions: [] }) }),
    ).rejects.toThrow(DebriefError);
  });

  it("throws DebriefError on refusal", async () => {
    await expect(
      compileDebrief(PLAN, TRANSCRIPT, { client: stubClient(null) }),
    ).rejects.toThrow(DebriefError);
  });

  it("returns an all-unattempted report without calling the model when nothing was answered", async () => {
    const client = {} as unknown as OpenAI; // any call would throw
    const onlyQuestions = TRANSCRIPT.filter((t) => t.role === "interviewer");
    const report = await compileDebrief(PLAN, onlyQuestions, { client });
    expect(report.perQuestion.every((q) => !q.attempted)).toBe(true);
    expect(report.dropped).toEqual([]);
  });

  it("resolves repeated identical quotes to successive occurrences, not the same one twice", async () => {
    const repeated = "I used SQL. Then I used SQL again.";
    const transcript = [
      turn("interviewer", "q?", "q-1"),
      turn("candidate", repeated, "q-1"),
    ];
    const wire = {
      questions: [
        {
          questionId: "q-1",
          summary: "s",
          covered: [
            { claim: "first mention", quote: "I used SQL" },
            { claim: "second mention", quote: "I used SQL" },
          ],
          missed: [],
        },
      ],
    };
    const report = await compileDebrief(PLAN, transcript, { client: stubClient(wire) });
    const q1 = report.perQuestion.find((q) => q.questionId === "q-1")!;
    const starts = q1.covered.map((c) => c.quote.span.start);
    expect(starts[0]).not.toBe(starts[1]);
    expect(starts[0]).toBeLessThan(starts[1]);
  });
});

describe("compileDebrief — video answers get computed timestamps", () => {
  const WORDS: TimedWord[] = [
    { start: 0.0, end: 0.4, text: "I" },
    { start: 0.4, end: 1.0, text: "used" },
    { start: 1.0, end: 2.0, text: "BigQuery" },
    { start: 2.0, end: 2.8, text: "daily" },
  ];
  const videoTurn: TranscriptTurn = {
    role: "candidate",
    questionId: "q-1",
    text: joinTimedWords(WORDS),
    mode: "video",
    videoId: "vid-1",
    timedWords: WORDS,
  };
  const transcript = [turn("interviewer", "q?", "q-1"), videoTurn];
  const wire = {
    questions: [
      {
        questionId: "q-1",
        summary: "s",
        covered: [{ claim: "Named the warehouse", quote: "BigQuery" }],
        missed: [],
      },
    ],
  };

  it("computes videoTime from the turn's timed words", async () => {
    const report = await compileDebrief(PLAN, transcript, { client: stubClient(wire) });
    const point = report.perQuestion.find((q) => q.questionId === "q-1")!.covered[0];
    expect(point.quote.videoTime).toEqual({ startSec: 1.0, endSec: 2.0 });
  });

  it("leaves videoTime null for a text answer", async () => {
    const report = await compileDebrief(PLAN, TRANSCRIPT, { client: stubClient(GOOD_WIRE) });
    const point = report.perQuestion.find((q) => q.questionId === "q-1")!.covered[0];
    expect(point.quote.videoTime).toBeNull();
  });
});

describe("DebriefWire — what the model may emit", () => {
  it("has no place to put a score, a grade, or a rating", () => {
    const parsed = DebriefWire.parse(GOOD_WIRE);
    const serialized = JSON.stringify(parsed);
    expect(serialized).not.toMatch(/score|rating|grade/i);
    expect(Object.keys(parsed.questions[0]).sort()).toEqual(
      ["covered", "missed", "questionId", "summary"].sort(),
    );
  });

  it("rejects a covered point with no quote — the rule the whole debrief rests on", () => {
    expect(() =>
      DebriefWire.parse({
        questions: [
          { questionId: "q-1", summary: "s", covered: [{ claim: "x" }], missed: [] },
        ],
      }),
    ).toThrow();
  });
});

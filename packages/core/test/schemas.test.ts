import { describe, it, expect } from "vitest";
import {
  DroppedLine,
  Gap,
  InterviewQuestion,
  ParsedJD,
  SessionPlan,
  TranscriptTurn,
} from "../src/schemas";

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

const GAP: Gap = {
  id: "gap-1",
  kind: "missing_skill",
  requirementId: "jd-1",
  jdSpan: { start: 0, end: 7, text: "Airflow" },
  resumeLineId: null,
  resumeSpan: null,
  rationale: "No mention of Airflow.",
};
const QUESTION: InterviewQuestion = {
  id: "q-1",
  kind: "conceptual",
  gapId: "gap-1",
  question: "How would you schedule a daily ETL job with retries?",
  starHints: null,
  rationale: "The JD demands Airflow; the resume is silent on orchestration.",
};

describe("InterviewQuestion — the question's receipt is its gapId", () => {
  it("validates a conceptual question with no STAR scaffold", () => {
    expect(InterviewQuestion.parse(QUESTION)).toEqual(QUESTION);
  });

  it("validates a behavioral question carrying all four STAR hints", () => {
    const q = InterviewQuestion.parse({
      ...QUESTION,
      id: "q-2",
      kind: "behavioral",
      starHints: {
        situation: "The pipeline you owned.",
        task: "What you were accountable for.",
        action: "The change you made.",
        result: "The measured outcome.",
      },
    });
    expect(q.starHints?.result).toBe("The measured outcome.");
  });

  it("rejects partial STAR hints — a half-scaffold is not a scaffold", () => {
    expect(() =>
      InterviewQuestion.parse({
        ...QUESTION,
        kind: "behavioral",
        starHints: { situation: "a", task: "b" },
      }),
    ).toThrow();
  });

  it("rejects an unknown question kind", () => {
    expect(() =>
      InterviewQuestion.parse({ ...QUESTION, kind: "technical" }),
    ).toThrow();
  });
});

describe("SessionPlan — self-contained client-held state", () => {
  const PLAN = {
    id: "plan-1",
    createdAt: "2026-07-27T09:00:00.000Z",
    jdText: "Airflow required.",
    resumeText: "Wrote SQL.",
    gaps: [GAP],
    questions: [QUESTION],
  };

  it("round-trips a plan carrying its own gaps and source texts", () => {
    const plan = SessionPlan.parse(PLAN);
    expect(plan.gaps[0].id).toBe(plan.questions[0].gapId);
  });

  it("rejects a plan with zero questions (an empty interview is not an interview)", () => {
    expect(() => SessionPlan.parse({ ...PLAN, questions: [] })).toThrow();
  });

  it("rejects a non-ISO createdAt", () => {
    expect(() => SessionPlan.parse({ ...PLAN, createdAt: "last Tuesday" })).toThrow();
  });
});

describe("TranscriptTurn — the debrief's source of truth", () => {
  it("validates a text answer with no video primitives", () => {
    const t = TranscriptTurn.parse({
      role: "candidate",
      questionId: "q-1",
      text: "I used cron, then moved to Airflow.",
      mode: "text",
      videoId: null,
      timedWords: null,
    });
    expect(t.timedWords).toBeNull();
  });

  it("validates a video answer whose text is the joined timed words", () => {
    const words = [
      { start: 0, end: 0.4, text: "I" },
      { start: 0.4, end: 0.9, text: "used" },
      { start: 0.9, end: 1.5, text: "Airflow" },
    ];
    const t = TranscriptTurn.parse({
      role: "candidate",
      questionId: "q-1",
      text: words.map((w) => w.text).join(" "),
      mode: "video",
      videoId: "vid-1",
      timedWords: words,
    });
    // The invariant the debrief's timestamp arithmetic rests on.
    expect(t.text).toBe("I used Airflow");
    expect(t.timedWords).toHaveLength(3);
  });

  it("allows a null questionId for interviewer chatter outside any question", () => {
    const t = TranscriptTurn.parse({
      role: "interviewer",
      questionId: null,
      text: "Thanks for your time — let's begin.",
      mode: "text",
      videoId: null,
      timedWords: null,
    });
    expect(t.questionId).toBeNull();
  });
});

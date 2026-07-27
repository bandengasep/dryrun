import { describe, it, expect } from "vitest";
import {
  buildInterviewerMessages,
  splitReplyAndMeta,
  SessionError,
  MAX_FOLLOWUPS,
} from "../src/session";
import type { Gap, SessionPlan, TranscriptTurn } from "../src/schemas";

const GAPS: Gap[] = [
  {
    id: "gap-1",
    kind: "weak_evidence",
    requirementId: "jd-1",
    jdSpan: { start: 0, end: 15, text: "3+ years of SQL" },
    resumeLineId: "cv-1",
    resumeSpan: { start: 0, end: 10, text: "Wrote SQL." },
    rationale: "SQL is claimed but never quantified.",
  },
  {
    id: "gap-2",
    kind: "missing_skill",
    requirementId: "jd-2",
    jdSpan: { start: 20, end: 27, text: "Airflow" },
    resumeLineId: null,
    resumeSpan: null,
    rationale: "No orchestration tooling anywhere.",
  },
];

const PLAN: SessionPlan = {
  id: "plan-1",
  createdAt: "2026-07-27T09:00:00.000Z",
  jdText: "3+ years of SQL. Airflow.",
  resumeText: "Wrote SQL.",
  gaps: GAPS,
  questions: [
    {
      id: "q-1",
      kind: "behavioral",
      gapId: "gap-1",
      question: "Tell me about the most complex SQL you have written.",
      starHints: {
        situation: "The dataset.",
        task: "What you owned.",
        action: "The query.",
        result: "The outcome.",
      },
      rationale: "SQL depth is unproven.",
    },
    {
      id: "q-2",
      kind: "conceptual",
      gapId: "gap-2",
      question: "How would you schedule a daily job that must retry on failure?",
      starHints: null,
      rationale: "Orchestration is absent from the resume.",
    },
  ],
};

const turn = (
  role: "interviewer" | "candidate",
  text: string,
  questionId: string | null = "q-1",
): TranscriptTurn => ({
  role,
  questionId,
  text,
  mode: "text",
  videoId: null,
  timedWords: null,
});

describe("splitReplyAndMeta — the turn protocol sentinel", () => {
  it("splits a trailing META line off the reply", () => {
    const { reply, action } = splitReplyAndMeta(
      'Thanks — that is clear.\nMETA: {"action": "advance"}',
    );
    expect(reply).toBe("Thanks — that is clear.");
    expect(action).toBe("advance");
  });

  it("reads every valid action", () => {
    for (const a of ["ask_followup", "advance", "wrap_up"] as const) {
      expect(splitReplyAndMeta(`Hi.\nMETA: {"action": "${a}"}`).action).toBe(a);
    }
  });

  it("fails soft to ask_followup when the model omits META entirely", () => {
    const { reply, action } = splitReplyAndMeta("Can you say more about that?");
    expect(reply).toBe("Can you say more about that?");
    expect(action).toBe("ask_followup");
  });

  it("fails soft when the META payload is not valid JSON", () => {
    const { reply, action } = splitReplyAndMeta("Go on.\nMETA: {action: advance");
    expect(action).toBe("ask_followup");
    // The malformed sentinel is still stripped — never shown to the candidate.
    expect(reply).toBe("Go on.");
  });

  it("fails soft when META carries an action outside the protocol", () => {
    expect(
      splitReplyAndMeta('Go on.\nMETA: {"action": "hire_them"}').action,
    ).toBe("ask_followup");
  });

  it("leaves a mid-text META inert — only the last line is the sentinel", () => {
    const full =
      'I once wrote META: {"action": "wrap_up"} into a config file by mistake.\nAnd then it broke.';
    const { reply, action } = splitReplyAndMeta(full);
    expect(reply).toBe(full);
    expect(action).toBe("ask_followup");
  });

  it("tolerates whitespace and trailing newlines around the sentinel", () => {
    const { reply, action } = splitReplyAndMeta(
      'Understood.\n\n  META:   {"action":"advance"}  \n\n',
    );
    expect(reply).toBe("Understood.");
    expect(action).toBe("advance");
  });

  it("returns an empty reply rather than throwing when the model sends only META", () => {
    const { reply, action } = splitReplyAndMeta('META: {"action": "wrap_up"}');
    expect(reply).toBe("");
    expect(action).toBe("wrap_up");
  });
});

describe("buildInterviewerMessages — core owns the prompt, web owns transport", () => {
  it("opens with a system message and then replays the transcript in order", () => {
    const transcript = [
      turn("interviewer", "Tell me about the most complex SQL you have written."),
      turn("candidate", "I built a funnel model."),
    ];
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript,
      questionIndex: 0,
    });
    expect(messages[0].role).toBe("system");
    expect(messages.slice(1).map((m) => m.role)).toEqual(["assistant", "user"]);
    expect(messages[2].content).toBe("I built a funnel model.");
  });

  it("maps interviewer turns to assistant and candidate turns to user", () => {
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [turn("candidate", "Hello."), turn("interviewer", "Hi.")],
      questionIndex: 0,
    });
    expect(messages[1]).toEqual({ role: "user", content: "Hello." });
    expect(messages[2]).toEqual({ role: "assistant", content: "Hi." });
  });

  it("puts the current question in the system prompt verbatim", () => {
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [],
      questionIndex: 1,
    });
    expect(messages[0].content).toContain(
      "How would you schedule a daily job that must retry on failure?",
    );
  });

  it("carries the question's gap receipt into the prompt as context", () => {
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [],
      questionIndex: 0,
    });
    // The JD line that demanded it and the resume line that was thin on it.
    expect(messages[0].content).toContain("3+ years of SQL");
    expect(messages[0].content).toContain("Wrote SQL.");
  });

  it("states the META protocol and the follow-up cap in the system prompt", () => {
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [],
      questionIndex: 0,
    });
    expect(messages[0].content).toContain("META:");
    expect(messages[0].content).toContain(String(MAX_FOLLOWUPS));
  });

  it("tells the interviewer it is on the last question when it is", () => {
    const last = buildInterviewerMessages({
      plan: PLAN,
      transcript: [],
      questionIndex: 1,
    });
    expect(last[0].content).toContain("last question");
  });

  it("throws SessionError for a questionIndex outside the plan", () => {
    expect(() =>
      buildInterviewerMessages({ plan: PLAN, transcript: [], questionIndex: 2 }),
    ).toThrow(SessionError);
    expect(() =>
      buildInterviewerMessages({ plan: PLAN, transcript: [], questionIndex: -1 }),
    ).toThrow(SessionError);
  });

  it("never emits an empty-content message, which providers reject", () => {
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [turn("candidate", "   ")],
      questionIndex: 0,
    });
    expect(messages.every((m) => m.content.trim().length > 0)).toBe(true);
  });
});

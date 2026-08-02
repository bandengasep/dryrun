import { describe, it, expect } from "vitest";
import {
  buildInterviewerMessages,
  splitReplyAndMeta,
  streamingReply,
  SessionError,
  MAX_FOLLOWUPS,
  KICKOFF_USER_MESSAGE,
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

describe("buildInterviewerMessages — provider compatibility floor", () => {
  // Agnes rejects a system-only messages array with
  //   400 "No user query found in messages."
  // whereas OpenAI accepts it. The first turn of every interview has an empty
  // transcript, so without this the opening question — the most visible moment
  // in the demo — would always fail over off the Agnes lane.
  it("always includes at least one user message, even with an empty transcript", () => {
    const messages = buildInterviewerMessages({ plan: PLAN, transcript: [], questionIndex: 0 });
    expect(messages.some((m) => m.role === "user")).toBe(true);
  });

  it("appends the kickoff only when the transcript has no candidate turn", () => {
    const withCandidate = buildInterviewerMessages({
      plan: PLAN,
      transcript: [turn("interviewer", "Q?"), turn("candidate", "My answer.")],
      questionIndex: 0,
    });
    expect(withCandidate.filter((m) => m.content === KICKOFF_USER_MESSAGE)).toHaveLength(0);
  });

  it("appends the kickoff when the transcript holds only interviewer turns", () => {
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [turn("interviewer", "Welcome.")],
      questionIndex: 0,
    });
    expect(messages[messages.length - 1]).toEqual({
      role: "user",
      content: KICKOFF_USER_MESSAGE,
    });
  });

  it("marks the kickoff as stage direction so it can never read as a candidate quote", () => {
    // The debrief quotes candidate turns verbatim. Synthetic text must be
    // unmistakable even though it never enters the transcript.
    expect(KICKOFF_USER_MESSAGE.startsWith("(")).toBe(true);
    expect(KICKOFF_USER_MESSAGE.endsWith(")")).toBe(true);
  });
});

describe("splitReplyAndMeta — terminal sentinels the 2 Aug prod leak taught us", () => {
  // The 31 Jul prompt trim dropped "output a final line", the model began
  // appending META inline after the prose, and last-line-prefix parsing showed
  // raw wire protocol to the candidate. A verified terminal sentinel must strip
  // wherever it sits; a META the prose merely mentions must stay inert.
  it("strips an inline trailing META on the prose line — the leaked prod shape", () => {
    const { reply, action } = splitReplyAndMeta(
      'Anything else about your experience so far? META: {"action": "ask_followup"}',
    );
    expect(reply).toBe("Anything else about your experience so far?");
    expect(action).toBe("ask_followup");
  });

  it("strips a compact inline sentinel and honors its action", () => {
    const { reply, action } = splitReplyAndMeta(
      'Understood, moving on. META:{"action":"advance"}',
    );
    expect(reply).toBe("Understood, moving on.");
    expect(action).toBe("advance");
  });

  it("strips a pretty-printed sentinel spanning multiple lines", () => {
    const { reply, action } = splitReplyAndMeta(
      'Thanks.\nMETA: {\n  "action": "advance"\n}',
    );
    expect(reply).toBe("Thanks.");
    expect(action).toBe("advance");
  });

  it("strips a fenced sentinel, fence and all", () => {
    const { reply, action } = splitReplyAndMeta(
      'Thanks.\n```\nMETA: {"action": "advance"}\n```',
    );
    expect(reply).toBe("Thanks.");
    expect(action).toBe("advance");
  });

  it("strips a language-tagged fenced sentinel", () => {
    const { reply, action } = splitReplyAndMeta(
      'Thanks.\n```json\nMETA: {"action": "advance"}\n```',
    );
    expect(reply).toBe("Thanks.");
    expect(action).toBe("advance");
  });

  it("strips a bold **META:** sentinel", () => {
    const { reply, action } = splitReplyAndMeta(
      'Thanks.\n**META:** {"action": "advance"}',
    );
    expect(reply).toBe("Thanks.");
    expect(action).toBe("advance");
  });

  it("strips the **META**: bolding variant too", () => {
    const { reply, action } = splitReplyAndMeta(
      'Thanks.\n**META**: {"action": "advance"}',
    );
    expect(reply).toBe("Thanks.");
    expect(action).toBe("advance");
  });

  it("tolerates extra keys in the sentinel payload", () => {
    const { reply, action } = splitReplyAndMeta(
      'Done. META: {"action": "advance", "confidence": 0.9}',
    );
    expect(reply).toBe("Done.");
    expect(action).toBe("advance");
  });

  it("strips an inline out-of-protocol action and degrades soft", () => {
    const { reply, action } = splitReplyAndMeta(
      'Go on. META: {"action": "hire_them"}',
    );
    expect(reply).toBe("Go on.");
    expect(action).toBe("ask_followup");
  });

  it("leaves a completed META followed by more prose inert — no over-strip", () => {
    const full = 'I mentioned META: {"action": "advance"} earlier in the call.';
    const { reply, action } = splitReplyAndMeta(full);
    expect(reply).toBe(full);
    expect(action).toBe("ask_followup");
  });

  it("leaves an unclosed META quoted mid-prose inert", () => {
    const full = "We can discuss META: {curly brace configs another time";
    const { reply, action } = splitReplyAndMeta(full);
    expect(reply).toBe(full);
    expect(action).toBe("ask_followup");
  });

  it("tolerates trailing whitespace after an inline sentinel", () => {
    const { reply, action } = splitReplyAndMeta(
      'Ok? META: {"action":"advance"}  \n\n',
    );
    expect(reply).toBe("Ok?");
    expect(action).toBe("advance");
  });
});

describe("buildInterviewerMessages — sentinel hygiene (2 Aug hotfix)", () => {
  it("instructs the model to emit META as a final line — the contract the parser anchors on", () => {
    // The 31 Jul trim silently dropped this wording and the leak followed;
    // this pin makes the next trim fail a test instead of prod.
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [],
      questionIndex: 0,
    });
    expect(messages[0].content).toMatch(/final line/);
  });

  it("sanitizes a leaked trailing sentinel out of replayed interviewer turns", () => {
    // Contaminated transcripts replay leaked META as assistant few-shot
    // examples, reinforcing the leak. Replay must strip, storage untouched.
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [
        turn("interviewer", 'Ok. META: {"action":"advance"}'),
        turn("candidate", "My answer."),
      ],
      questionIndex: 0,
    });
    expect(messages[1]).toEqual({ role: "assistant", content: "Ok." });
  });

  it("drops a replayed interviewer turn that was pure sentinel", () => {
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [turn("interviewer", 'META: {"action":"advance"}')],
      questionIndex: 0,
    });
    expect(messages.filter((m) => m.role === "assistant")).toHaveLength(0);
    // Providers reject empty content; the drop must not leave a husk behind.
    expect(messages.every((m) => m.content.trim().length > 0)).toBe(true);
  });

  it("never rewrites candidate turns, even when they quote the protocol", () => {
    // The debrief quotes candidates verbatim; replay must too.
    const text = 'My config ended with META: {"action": "advance"}';
    const messages = buildInterviewerMessages({
      plan: PLAN,
      transcript: [turn("candidate", text)],
      questionIndex: 0,
    });
    expect(messages[1]).toEqual({ role: "user", content: text });
  });
});

describe("streamingReply — what the candidate may see of a growing buffer", () => {
  // The client re-derives the visible bubble from the raw stream buffer every
  // render. Anything that could still resolve into the sentinel is withheld,
  // so wire protocol never flashes — not even for the one delta before the
  // closing brace arrives. The trailing META frame reconciles at stream end.
  it("withholds an in-flight partial sentinel", () => {
    expect(streamingReply('Anything else? META: {"ac')).toBe("Anything else?");
  });

  it("withholds a bare trailing token", () => {
    expect(streamingReply("Anything else? META:")).toBe("Anything else?");
  });

  it("withholds a boundary-anchored token prefix", () => {
    expect(streamingReply("Anything else? ME")).toBe("Anything else?");
    expect(streamingReply("Anything else? M")).toBe("Anything else?");
  });

  it("strips a completed sentinel exactly like the final parse", () => {
    expect(streamingReply('Thanks.\nMETA: {"action":"advance"}')).toBe("Thanks.");
  });

  it("shows a mid-text META once prose follows its close", () => {
    const full = 'I once wrote META: {"action":"wrap_up"} into a config';
    expect(streamingReply(full)).toBe(full);
  });

  it("leaves plain prose untouched, including non-boundary M-words", () => {
    expect(streamingReply("We shipped the READ.ME")).toBe("We shipped the READ.ME");
  });

  it("trims a boundary M-word that could be the token starting", () => {
    // Over-withholding is transient: the next delta restores it if it was prose.
    expect(streamingReply("And then M")).toBe("And then");
  });

  it("keeps an empty buffer empty", () => {
    expect(streamingReply("")).toBe("");
  });
});

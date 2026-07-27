import { describe, it, expect } from "vitest";
import type OpenAI from "openai";
import { compileSessionPlan, PlanError, PlanWire } from "../src/plan";
import { SessionPlan, type Gap } from "../src/schemas";

/** Stub for the single batched plan call. Captures the request payload so tests
 * pin the wiring, not just the mapping (same shape as test/diff.test.ts). */
function stubClient(
  parsed: unknown,
  captured: { payload?: unknown; system?: unknown } = {},
): OpenAI {
  return {
    responses: {
      parse: async (params: { input: { role: string; content: string }[] }) => {
        const user = params.input.find((m) => m.role === "user");
        const system = params.input.find((m) => m.role === "system");
        captured.payload = user ? JSON.parse(user.content) : null;
        captured.system = system?.content;
        return { output_parsed: parsed };
      },
    },
  } as unknown as OpenAI;
}

const GAPS: Gap[] = [
  {
    id: "gap-1",
    kind: "missing_skill",
    requirementId: "jd-1",
    jdSpan: { start: 0, end: 7, text: "Airflow" },
    resumeLineId: null,
    resumeSpan: null,
    rationale: "No orchestration tooling anywhere in the resume.",
  },
  {
    id: "gap-2",
    kind: "weak_evidence",
    requirementId: "jd-2",
    jdSpan: { start: 12, end: 27, text: "3+ years of SQL" },
    resumeLineId: "cv-1",
    resumeSpan: { start: 0, end: 10, text: "Wrote SQL." },
    rationale: "Mentions SQL but never quantifies depth or duration.",
  },
];

const STAR = {
  situation: "The dataset and its state.",
  task: "What you owned.",
  action: "The queries you wrote.",
  result: "The measured outcome.",
};

const JD_TEXT = "Airflow and 3+ years of SQL.";
const RESUME_TEXT = "Wrote SQL.";

/** Two well-formed questions, one per gap — the happy-path model response. */
const GOOD_WIRE = {
  questions: [
    {
      gapId: "gap-1",
      kind: "conceptual",
      question: "How would you schedule a daily ETL job that must retry on failure?",
      starHints: null,
      rationale: "The JD demands Airflow; the resume never mentions orchestration.",
    },
    {
      gapId: "gap-2",
      kind: "behavioral",
      question: "Tell me about the most complex SQL you have written.",
      starHints: STAR,
      rationale: "SQL is claimed but unquantified, so the depth needs probing.",
    },
  ],
};

describe("compileSessionPlan — questions inherit their gap's receipt", () => {
  it("assigns q-N ids in order rather than trusting the model for them", async () => {
    const plan = await compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, {
      client: stubClient(GOOD_WIRE),
    });
    expect(plan.questions.map((q) => q.id)).toEqual(["q-1", "q-2"]);
    expect(plan.questions.map((q) => q.gapId)).toEqual(["gap-1", "gap-2"]);
  });

  it("returns a plan that is self-contained and schema-valid", async () => {
    const plan = await compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, {
      client: stubClient(GOOD_WIRE),
    });
    expect(() => SessionPlan.parse(plan)).not.toThrow();
    expect(plan.gaps).toEqual(GAPS);
    expect(plan.jdText).toBe(JD_TEXT);
    expect(plan.resumeText).toBe(RESUME_TEXT);
    expect(Number.isNaN(Date.parse(plan.createdAt))).toBe(false);
  });

  it("throws PlanError when a question cites a gap that does not exist (fabricated receipt)", async () => {
    const client = stubClient({
      questions: [
        { ...GOOD_WIRE.questions[0], gapId: "gap-99" },
        GOOD_WIRE.questions[1],
      ],
    });
    await expect(
      compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, { client }),
    ).rejects.toThrow(PlanError);
  });

  it("names the offending gapId in the grounding error", async () => {
    const client = stubClient({
      questions: [{ ...GOOD_WIRE.questions[0], gapId: "gap-99" }],
    });
    await expect(
      compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, { client }),
    ).rejects.toThrow(/gap-99/);
  });

  it("throws PlanError when a behavioral question arrives without STAR hints", async () => {
    const client = stubClient({
      questions: [{ ...GOOD_WIRE.questions[1], starHints: null }],
    });
    await expect(
      compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, { client }),
    ).rejects.toThrow(PlanError);
  });

  it("coerces starHints to null on a conceptual question (drop, never fabricate)", async () => {
    const client = stubClient({
      questions: [{ ...GOOD_WIRE.questions[0], starHints: STAR }],
    });
    const plan = await compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, { client });
    expect(plan.questions[0].kind).toBe("conceptual");
    expect(plan.questions[0].starHints).toBeNull();
  });

  it("throws PlanError on refusal (no structured output)", async () => {
    await expect(
      compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, { client: stubClient(null) }),
    ).rejects.toThrow(PlanError);
  });

  it("throws PlanError when the model returns zero questions", async () => {
    await expect(
      compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, {
        client: stubClient({ questions: [] }),
      }),
    ).rejects.toThrow(PlanError);
  });

  it("throws PlanError for an empty gap set without calling the model", async () => {
    const client = {} as unknown as OpenAI; // any call would throw TypeError, not PlanError
    await expect(
      compileSessionPlan([], JD_TEXT, RESUME_TEXT, { client }),
    ).rejects.toThrow(PlanError);
  });

  it("caps the plan at maxQuestions when the model overshoots", async () => {
    const client = stubClient({
      questions: [
        GOOD_WIRE.questions[0],
        GOOD_WIRE.questions[1],
        { ...GOOD_WIRE.questions[0], question: "A third question." },
      ],
    });
    const plan = await compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, {
      client,
      maxQuestions: 2,
    });
    expect(plan.questions).toHaveLength(2);
    expect(plan.questions.map((q) => q.id)).toEqual(["q-1", "q-2"]);
  });

  it("sends every gap with its kind and JD quote so the model can only cite real ids", async () => {
    const captured: { payload?: unknown; system?: unknown } = {};
    await compileSessionPlan(GAPS, JD_TEXT, RESUME_TEXT, {
      client: stubClient(GOOD_WIRE, captured),
    });
    const payload = captured.payload as {
      maxQuestions: number;
      gaps: { id: string; kind: string; jdQuote: string; resumeQuote: string | null }[];
    };
    expect(payload.gaps.map((g) => g.id)).toEqual(["gap-1", "gap-2"]);
    expect(payload.gaps[0].kind).toBe("missing_skill");
    expect(payload.gaps[0].jdQuote).toBe("Airflow");
    expect(payload.gaps[0].resumeQuote).toBeNull();
    expect(payload.gaps[1].resumeQuote).toBe("Wrote SQL.");
    expect(payload.maxQuestions).toBe(6);
  });
});

describe("PlanWire — what the model is allowed to emit", () => {
  it("rejects an unknown question kind", () => {
    expect(() =>
      PlanWire.parse({
        questions: [{ ...GOOD_WIRE.questions[0], kind: "technical" }],
      }),
    ).toThrow();
  });

  it("rejects partial STAR hints", () => {
    expect(() =>
      PlanWire.parse({
        questions: [
          { ...GOOD_WIRE.questions[1], starHints: { situation: "a", task: "b" } },
        ],
      }),
    ).toThrow();
  });

  it("carries no question id — ids are assigned by the compiler, not the model", () => {
    const parsed = PlanWire.parse(GOOD_WIRE);
    expect(parsed.questions[0]).not.toHaveProperty("id");
  });
});

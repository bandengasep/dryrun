import { z } from "zod";

/**
 * A character-offset span into a source document (JD or resume). Every receipt
 * anchors to one of these — this is what makes a gap traceable back to the text.
 */
export const SourceSpan = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string(),
});
export type SourceSpan = z.infer<typeof SourceSpan>;

/** One atomic requirement extracted from the job description. */
export const RequirementLine = z.object({
  id: z.string(),
  text: z.string(),
  span: SourceSpan,
});
export type RequirementLine = z.infer<typeof RequirementLine>;

/** One atomic line extracted from the resume. */
export const ResumeLine = z.object({
  id: z.string(),
  text: z.string(),
  span: SourceSpan,
});
export type ResumeLine = z.infer<typeof ResumeLine>;

/** The typed set-difference verdict for a single JD requirement. */
export const GapKind = z.enum([
  "missing_skill",
  "weak_evidence",
  "strong_differentiator",
]);
export type GapKind = z.infer<typeof GapKind>;

/**
 * A gap and its receipts: the JD requirement that demands it, plus the resume line
 * (if any) that speaks to it. `resumeLineId` / `resumeSpan` are null when nothing in
 * the resume matches — that is itself the evidence for a `missing_skill`.
 */
export const Gap = z.object({
  id: z.string(),
  kind: GapKind,
  requirementId: z.string(),
  jdSpan: SourceSpan,
  resumeLineId: z.string().nullable(),
  resumeSpan: SourceSpan.nullable(),
  rationale: z.string(),
});
export type Gap = z.infer<typeof Gap>;

/**
 * A line the parser extracted but could not anchor to the source text. Kept —
 * never silently dropped — because unlocatable quotes are exactly what the
 * citation-validity eval counts.
 */
export const DroppedLine = z.object({
  text: z.string(),
  quote: z.string(),
  reason: z.literal("quote_not_found"),
});
export type DroppedLine = z.infer<typeof DroppedLine>;

/** Parser output for a JD: located requirement lines + honest failures. */
export const ParsedJD = z.object({
  sourceText: z.string(),
  lines: z.array(RequirementLine),
  dropped: z.array(DroppedLine),
});
export type ParsedJD = z.infer<typeof ParsedJD>;

/** Parser output for a resume: located evidence lines + honest failures. */
export const ParsedResume = z.object({
  sourceText: z.string(),
  lines: z.array(ResumeLine),
  dropped: z.array(DroppedLine),
});
export type ParsedResume = z.infer<typeof ParsedResume>;

/**
 * What a question is asking the candidate to do. `behavioral` questions want a
 * lived story (and therefore carry STAR scaffolding); `conceptual` questions
 * want understanding of a thing the resume never evidenced, so there is no
 * story to scaffold.
 */
export const QuestionKind = z.enum(["behavioral", "conceptual"]);
export type QuestionKind = z.infer<typeof QuestionKind>;

/**
 * One-line prompts scaffolding a STAR answer. Hints only — they tell the
 * candidate what each beat should contain, never what to say. Behavioral
 * questions always carry them; conceptual questions never do (see
 * InterviewQuestion).
 */
export const StarHints = z.object({
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
});
export type StarHints = z.infer<typeof StarHints>;

/**
 * A question the candidate is likely to face, compiled from one measured gap.
 * `gapId` is THE receipt — it chains question → gap → JD span + resume span, so
 * every question on screen can be traced to the line that demands it. A question
 * citing an unknown gap is rejected in compileSessionPlan (grounding guard),
 * never rendered.
 *
 * Invariant, enforced at compile time and pinned by tests:
 *   kind === "behavioral"  ⟺  starHints !== null
 */
export const InterviewQuestion = z.object({
  id: z.string(),
  kind: QuestionKind,
  /** Must reference a Gap.id present in the same SessionPlan. */
  gapId: z.string(),
  question: z.string(),
  starHints: StarHints.nullable(),
  /** Why this gap produces this question — shown in the receipts drawer. */
  rationale: z.string(),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestion>;

/**
 * The compiled interview: everything the session and the debrief need, in one
 * self-contained object. Deliberately carries `gaps` and the source texts so
 * client-held state is complete — serverless routes are stateless, so the client
 * re-sends this per request and the FE resolves `question.gapId` → spans locally
 * without another round trip.
 */
export const SessionPlan = z.object({
  id: z.string(),
  /** ISO-8601 timestamp, set at compile time. */
  createdAt: z.iso.datetime(),
  jdText: z.string(),
  resumeText: z.string(),
  gaps: z.array(Gap),
  questions: z.array(InterviewQuestion).min(1),
});
export type SessionPlan = z.infer<typeof SessionPlan>;

/**
 * One word of a video answer's timed transcript, in seconds from the start of
 * the recording. VideoDB emits these; they are the raw material for mapping a
 * debrief quote's character offsets back to a timestamp.
 */
export const TimedWord = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
});
export type TimedWord = z.infer<typeof TimedWord>;

/**
 * One turn of the rehearsal. `questionId` links a turn to the plan question it
 * belongs to (null for free-floating interviewer chatter such as the opening
 * greeting or the wrap-up).
 *
 * For `mode: "video"` turns, `text` is built ONLY by joinTimedWords over
 * `timedWords` — never transcribed independently — so a character offset into
 * `text` maps to a timestamp by exact arithmetic rather than by search. That is
 * why the debrief validates quotes against `turn.text` and not against any video
 * primitive: when video is off, the same code path still works and only the
 * timestamps are absent.
 */
export const TranscriptTurn = z.object({
  role: z.enum(["interviewer", "candidate"]),
  questionId: z.string().nullable(),
  text: z.string(),
  mode: z.enum(["text", "video"]),
  videoId: z.string().nullable(),
  timedWords: z.array(TimedWord).nullable(),
});
export type TranscriptTurn = z.infer<typeof TranscriptTurn>;

/** JSON-safe subset of SQLite values used in challenge expectations. */
export const SqlValue = z.union([z.string(), z.number(), z.null()]);
export type SqlValue = z.infer<typeof SqlValue>;

/** One executable check inside a challenge: run `sql`, expect these rows. */
export const ChallengeTest = z.object({
  name: z.string(),
  sql: z.string(),
  expectedRows: z.array(z.record(z.string(), SqlValue)),
  /** When false, row order is ignored in the comparison. */
  ordered: z.boolean(),
});
export type ChallengeTest = z.infer<typeof ChallengeTest>;

/**
 * A compiled SQL challenge. `gapId` is the receipt chain: challenge → gap →
 * JD/resume spans. A challenge ships only if runChallenge passes all tests —
 * execution is ground truth (harness lives in @dryrun/core/harness).
 */
export const ChallengeSpec = z.object({
  id: z.string(),
  gapId: z.string(),
  title: z.string(),
  prompt: z.string(),
  /** DDL + seed rows, executed as one script against a fresh database. */
  setupSql: z.string(),
  referenceSql: z.string(),
  tests: z.array(ChallengeTest).min(1),
});
export type ChallengeSpec = z.infer<typeof ChallengeSpec>;

export const ChallengeTestFailure = z.object({
  test: z.string(),
  reason: z.string(),
  expected: z.array(z.record(z.string(), SqlValue)).nullable(),
  actual: z.array(z.record(z.string(), SqlValue)).nullable(),
});
export type ChallengeTestFailure = z.infer<typeof ChallengeTestFailure>;

export const ChallengeRunResult = z.object({
  challengeId: z.string(),
  passed: z.boolean(),
  failures: z.array(ChallengeTestFailure),
});
export type ChallengeRunResult = z.infer<typeof ChallengeRunResult>;

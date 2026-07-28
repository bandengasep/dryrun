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
 * Everything a compile produces: the parsed documents and the gaps between them.
 * This is the wire contract between /api/compile and /api/plan, and the shape the
 * client holds between the two — it lives here rather than in the web app so both
 * ends validate against one definition. Carries the full parser output, not just
 * gaps, because the receipts UI needs the source texts and line spans.
 */
export const CompileResult = z.object({
  jd: ParsedJD,
  resume: ParsedResume,
  gaps: z.array(Gap),
});
export type CompileResult = z.infer<typeof CompileResult>;

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

/**
 * A verbatim quote from the candidate's own transcript, re-located mechanically
 * with the same span locator the parsers use. `turnIndex` says which turn, and
 * `span` indexes into that turn's `text`, so the invariant is identical to the
 * JD/resume one:
 *   transcript[turnIndex].text.slice(span.start, span.end) === span.text
 * `videoTime` is computed arithmetically from the turn's timed words — never
 * emitted by a model — and is null for text answers.
 */
export const TranscriptQuote = z.object({
  turnIndex: z.number().int().nonnegative(),
  span: SourceSpan,
  videoTime: z
    .object({ startSec: z.number().nonnegative(), endSec: z.number().nonnegative() })
    .nullable(),
});
export type TranscriptQuote = z.infer<typeof TranscriptQuote>;

/**
 * Something the answer did cover. Every one carries a quote — this is the rule
 * that makes the debrief auditable rather than assertive. A claim whose quote
 * fails to re-locate is demoted to `dropped`, never displayed.
 */
export const CoveragePoint = z.object({
  claim: z.string(),
  quote: TranscriptQuote,
});
export type CoveragePoint = z.infer<typeof CoveragePoint>;

/**
 * Something the answer did not cover. Carries NO quote by design: you cannot
 * quote an absence. Same precedent as a `missing_skill` gap, whose resume
 * receipt is null because the silence is the evidence.
 */
export const MissedPoint = z.object({
  claim: z.string(),
});
export type MissedPoint = z.infer<typeof MissedPoint>;

/** A coverage claim whose quote could not be found in the transcript. Shown as a count, never hidden. */
export const DroppedQuote = z.object({
  questionId: z.string(),
  claim: z.string(),
  quote: z.string(),
  reason: z.literal("quote_not_found"),
});
export type DroppedQuote = z.infer<typeof DroppedQuote>;

/**
 * The debrief for one question. `gapId` is copied from the plan rather than
 * taken from the model, so the receipt chain question → gap → JD/resume spans
 * cannot be rewritten at debrief time.
 */
export const QuestionDebrief = z.object({
  questionId: z.string(),
  gapId: z.string(),
  summary: z.string(),
  covered: z.array(CoveragePoint),
  missed: z.array(MissedPoint),
  /** False when the candidate never answered — rendered as "not attempted". */
  attempted: z.boolean(),
});
export type QuestionDebrief = z.infer<typeof QuestionDebrief>;

/**
 * The whole debrief. No scores, no grades, no pass/fail — anywhere, by design.
 * `dropped` is surfaced in the UI as an honesty footer.
 */
export const DebriefReport = z.object({
  planId: z.string(),
  perQuestion: z.array(QuestionDebrief),
  dropped: z.array(DroppedQuote),
});
export type DebriefReport = z.infer<typeof DebriefReport>;

/**
 * Request bodies for the stateful-looking-but-stateless session routes. The
 * client holds the session and re-sends it every turn, so these are the shapes
 * that cross the wire repeatedly — defined here so the route validates against
 * the same definition the client built from.
 */
export const SessionTurnRequest = z.object({
  plan: SessionPlan,
  transcript: z.array(TranscriptTurn),
  questionIndex: z.number().int().nonnegative(),
});
export type SessionTurnRequest = z.infer<typeof SessionTurnRequest>;

export const DebriefRequest = z.object({
  plan: SessionPlan,
  transcript: z.array(TranscriptTurn),
});
export type DebriefRequest = z.infer<typeof DebriefRequest>;

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

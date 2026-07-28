// Offline demo mode — everything a session needs, synthesized client-side with
// keyword overlap instead of a model call. No network, no cost, no key
// required. Every shape produced here validates against the exact same Zod
// schemas the real OpenAI-backed pipeline produces, because the pages that
// consume this output (plan, session, debrief) do not know or care which path
// built their state.
//
// The one thing this file is NOT allowed to fake: a receipt. Every span below
// is computed with indexOf against the real source text a user typed or
// uploaded, so `sourceText.slice(start, end) === text` holds exactly as it
// does for the model path — an offline demo is still bound by the receipts
// law in AGENTS.md rule 1. What's fake is the judgment (keyword overlap
// instead of an LLM verdict), never the citation mechanics, and the copy says
// so everywhere a claim is made ("Offline mock: … — no model judgment
// involved.").
import {
  CompileResult,
  DebriefReport,
  SessionPlan,
  NOT_ATTEMPTED_SUMMARY,
  type CoveragePoint,
  type Gap,
  type GapKind,
  type InterviewQuestion,
  type QuestionDebrief,
  type RequirementLine,
  type ResumeLine,
  type SourceSpan,
  type TranscriptTurn,
} from "@dryrun/core";

const MOCK_FLAG_KEY = "dryrun-mock";
const MAX_GAPS = 12;
const MAX_QUESTIONS = 6;

// ---------------------------------------------------------------------------
// Flag plumbing
// ---------------------------------------------------------------------------

/** True when this tab is in offline demo mode. Reads sessionStorage only — no
 *  network, matching the "offline" claim on the banner. */
export function mockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(MOCK_FLAG_KEY) === "1";
  } catch {
    // Storage blocked (Safari private mode, sandboxed iframe): mock mode just
    // can't be requested this way; the real pipeline still works.
    return false;
  }
}

/**
 * Latch `?mock=1` into sessionStorage so the flag survives client-side
 * navigation to /plan without threading it through every link. Call
 * defensively (in a useEffect, on mount) on every page that can be a mock
 * entry point.
 */
export function ensureMockFlagFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mock") === "1") {
      window.sessionStorage.setItem(MOCK_FLAG_KEY, "1");
    }
  } catch {
    // Nothing to fall back to — the flag just won't stick in this tab.
  }
}

/** Ochre strip: "this screen is not talking to a model." */
export function MockBanner() {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: "rgba(168, 126, 47, 0.1)",
        border: "1px solid rgba(168, 126, 47, 0.35)",
        borderRadius: "10px",
        padding: "10px 16px",
        marginBottom: "24px",
        fontFamily:
          "var(--font-code), ui-monospace, 'SF Mono', Menlo, Monaco, monospace",
        fontSize: "12px",
        letterSpacing: "0.02em",
        color: "#8a651f",
      }}
    >
      <span aria-hidden="true">●</span>
      Offline demo mode — no model calls; gaps by keyword overlap
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared mechanics
// ---------------------------------------------------------------------------

/** Distinct lowercased content words (>3 chars) — the whole notion of
 *  "judgment" in this file. */
function contentWords(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(words.filter((w) => w.length > 3));
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

/**
 * Trimmed, non-empty lines of `sourceText`, each with a span located by
 * indexOf against the ORIGINAL string (never a normalized copy) — the
 * invariant every receipt in this product depends on. A cursor advances past
 * each match so repeated lines resolve to successive occurrences instead of
 * all pointing at the first one.
 */
function splitLinesWithSpans(sourceText: string): { text: string; span: SourceSpan }[] {
  const out: { text: string; span: SourceSpan }[] = [];
  let cursor = 0;
  for (const raw of sourceText.split("\n")) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const start = sourceText.indexOf(trimmed, cursor);
    // Not reachable given trim() only strips the ends of a real substring of
    // sourceText, but a dropped line beats a fabricated span.
    if (start === -1) continue;
    cursor = start + trimmed.length;
    out.push({ text: trimmed, span: { start, end: start + trimmed.length, text: trimmed } });
  }
  return out;
}

// ---------------------------------------------------------------------------
// mockCompile
// ---------------------------------------------------------------------------

/**
 * Diff by keyword overlap instead of adjudication. Every JD line longer than
 * 20 characters is a candidate requirement; every resume line is candidate
 * evidence. A requirement's gap kind is decided by how many of its own
 * content words appear anywhere in the resume — 0 shared → missing_skill,
 * 1–2 → weak_evidence citing whichever resume line overlaps it the most,
 * 3+ → strong_differentiator citing the same. Capped at 12 gaps.
 */
export function mockCompile(jd: string, resume: string): CompileResult {
  const jdLinesAll = splitLinesWithSpans(jd);
  const resumeLinesAll = splitLinesWithSpans(resume);

  const jdLines: RequirementLine[] = [];
  for (const line of jdLinesAll) {
    if (line.text.length > 20) {
      jdLines.push({ id: `jd-${jdLines.length + 1}`, text: line.text, span: line.span });
    }
  }

  const resumeLines: ResumeLine[] = resumeLinesAll.map((line, i) => ({
    id: `cv-${i + 1}`,
    text: line.text,
    span: line.span,
  }));

  const resumeWords = contentWords(resume);
  const resumeLineWords = resumeLines.map((line) => ({ line, words: contentWords(line.text) }));

  const gaps: Gap[] = [];
  for (const req of jdLines) {
    if (gaps.length >= MAX_GAPS) break;

    const reqWords = contentWords(req.text);
    const score = overlapCount(reqWords, resumeWords);

    let kind: GapKind;
    let cited: ResumeLine | null = null;

    if (score === 0) {
      kind = "missing_skill";
    } else {
      kind = score >= 3 ? "strong_differentiator" : "weak_evidence";
      let best: ResumeLine | null = null;
      let bestScore = -1;
      for (const candidate of resumeLineWords) {
        const c = overlapCount(reqWords, candidate.words);
        if (c > bestScore) {
          bestScore = c;
          best = candidate.line;
        }
      }
      cited = best;
    }

    gaps.push({
      id: `gap-${gaps.length + 1}`,
      kind,
      requirementId: req.id,
      jdSpan: req.span,
      resumeLineId: cited?.id ?? null,
      resumeSpan: cited?.span ?? null,
      rationale: `Offline mock: ${score} keyword overlap${score === 1 ? "" : "s"} with your resume — no model judgment involved.`,
    });
  }

  const result: CompileResult = {
    jd: { sourceText: jd, lines: jdLines, dropped: [] },
    resume: { sourceText: resume, lines: resumeLines, dropped: [] },
    gaps,
  };

  if (process.env.NODE_ENV !== "production") {
    const parsed = CompileResult.safeParse(result);
    if (!parsed.success) {
      // A schema mismatch here is a bug in this file, never a user-facing
      // failure — log loudly in dev, ship the object either way.
      console.error("[mock] mockCompile output failed CompileResult.safeParse", parsed.error);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// mockPlan
// ---------------------------------------------------------------------------

const STAR_HINTS_TEMPLATE = {
  situation: "What was the context or project?",
  task: "What were you responsible for?",
  action: "What did you specifically do?",
  result: "What happened as a result?",
};

/**
 * One question per gap, in gap order, capped at 6. weak_evidence gaps always
 * become a behavioral question with STAR hints; missing_skill gaps always
 * become a conceptual question; at most one strong_differentiator becomes a
 * conceptual "flex" question, the rest are skipped (mirrors the real plan
 * compiler's "usually skip; cover at most one" policy, minus the model).
 */
export function mockPlan(compile: CompileResult): SessionPlan {
  const questions: InterviewQuestion[] = [];
  let flexUsed = false;

  for (const gap of compile.gaps) {
    if (questions.length >= MAX_QUESTIONS) break;

    if (gap.kind === "weak_evidence") {
      questions.push({
        id: `q-${questions.length + 1}`,
        kind: "behavioral",
        gapId: gap.id,
        question: `Tell me about a specific time you worked with "${gap.jdSpan.text}". Walk me through what you did.`,
        starHints: { ...STAR_HINTS_TEMPLATE },
        rationale: `Offline mock: keyword overlap suggested only partial coverage of "${gap.jdSpan.text}" — this probes how deep it actually goes.`,
      });
    } else if (gap.kind === "missing_skill") {
      questions.push({
        id: `q-${questions.length + 1}`,
        kind: "conceptual",
        gapId: gap.id,
        question: `The role asks for "${gap.jdSpan.text}", and nothing in your resume shared a keyword with it. How would you approach it?`,
        starHints: null,
        rationale: `Offline mock: no resume line overlapped "${gap.jdSpan.text}" by keyword — a conceptual check instead of a story.`,
      });
    } else if (gap.kind === "strong_differentiator") {
      if (flexUsed) continue;
      flexUsed = true;
      questions.push({
        id: `q-${questions.length + 1}`,
        kind: "conceptual",
        gapId: gap.id,
        question: `Your resume shows strong keyword overlap on "${gap.jdSpan.text}". What's the most advanced thing you've done with it?`,
        starHints: null,
        rationale: `Offline mock: keyword overlap was strongest here — one flex question on "${gap.jdSpan.text}".`,
      });
    }
  }

  const plan: SessionPlan = {
    id: `plan-mock-${Date.now()}`,
    createdAt: new Date().toISOString(),
    jdText: compile.jd.sourceText,
    resumeText: compile.resume.sourceText,
    gaps: compile.gaps,
    questions,
  };

  if (process.env.NODE_ENV !== "production") {
    const parsed = SessionPlan.safeParse(plan);
    if (!parsed.success) {
      console.error("[mock] mockPlan output failed SessionPlan.safeParse", parsed.error);
    }
  }

  return plan;
}

// ---------------------------------------------------------------------------
// mockTurn
// ---------------------------------------------------------------------------

/**
 * Deterministic interviewer behavior, keyed only on how many times the
 * candidate has answered the current question: first turn echoes the
 * question, second asks for a concrete example, third moves on (advancing to
 * the next question, or wrapping up if this was the last one).
 */
export function mockTurn(
  plan: SessionPlan,
  transcript: TranscriptTurn[],
  questionIndex: number,
): { reply: string; action: "ask_followup" | "advance" | "wrap_up" } {
  const question = plan.questions[questionIndex];
  const answered = transcript.filter(
    (t) => t.role === "candidate" && t.questionId === question.id,
  ).length;

  if (answered === 0) {
    return { reply: question.question, action: "ask_followup" };
  }
  if (answered === 1) {
    return {
      reply: "Could you make that concrete with one specific example?",
      action: "ask_followup",
    };
  }
  const isLast = questionIndex === plan.questions.length - 1;
  return { reply: "Thanks — let's move on.", action: isLast ? "wrap_up" : "advance" };
}

// ---------------------------------------------------------------------------
// mockDebrief
// ---------------------------------------------------------------------------

/** First sentence of `text`, capped at 140 chars — the same clause the debrief
 *  UI shows as a "covered" quote, sized for a card rather than a transcript. */
function firstSentenceUpTo140(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return trimmed;
  const match = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  let sentence = match ? match[0] : trimmed;
  if (sentence.length > 140) sentence = sentence.slice(0, 140);
  return sentence.trim();
}

/**
 * One CoveragePoint per answered question (the candidate said real words —
 * that's all the offline mock can verify), one honest MissedPoint saying the
 * mock cannot judge content, and NOT_ATTEMPTED_SUMMARY for anything skipped.
 * Never drops a quote: the quote is sliced directly out of the turn it came
 * from, so the span invariant holds by construction.
 */
export function mockDebrief(plan: SessionPlan, transcript: TranscriptTurn[]): DebriefReport {
  const perQuestion: QuestionDebrief[] = [];

  for (const question of plan.questions) {
    const answers: { turn: TranscriptTurn; index: number }[] = [];
    transcript.forEach((turn, index) => {
      if (turn.role === "candidate" && turn.questionId === question.id && turn.text.trim().length > 0) {
        answers.push({ turn, index });
      }
    });

    if (answers.length === 0) {
      perQuestion.push({
        questionId: question.id,
        gapId: question.gapId,
        summary: NOT_ATTEMPTED_SUMMARY,
        covered: [],
        missed: [],
        attempted: false,
      });
      continue;
    }

    const first = answers[0];
    const quoteText = firstSentenceUpTo140(first.turn.text);
    const start = first.turn.text.indexOf(quoteText);

    const covered: CoveragePoint[] =
      start === -1
        ? []
        : [
            {
              claim: "Gave a direct answer in your own words",
              quote: {
                turnIndex: first.index,
                span: { start, end: start + quoteText.length, text: quoteText },
                // The mock never synthesizes timed words — text-only, always.
                videoTime: null,
              },
            },
          ];

    perQuestion.push({
      questionId: question.id,
      gapId: question.gapId,
      summary: `Offline mock: answered across ${answers.length} turn${answers.length === 1 ? "" : "s"} — content wasn't evaluated, only that words were said.`,
      covered,
      missed: [{ claim: "The offline mock can't judge content — rehearse online for a real read" }],
      attempted: true,
    });
  }

  const report: DebriefReport = { planId: plan.id, perQuestion, dropped: [] };

  if (process.env.NODE_ENV !== "production") {
    const parsed = DebriefReport.safeParse(report);
    if (!parsed.success) {
      console.error("[mock] mockDebrief output failed DebriefReport.safeParse", parsed.error);
    }
  }

  return report;
}


"use client";

// The full rehearsal transcript, collapsed by default. Turns are grouped by
// the plan question they belong to (so a follow-up falls in naturally, right
// under the question that prompted it) rather than rendered as one flat log.
//
// Exposes an imperative `focusTurn` handle so a QuoteChip anywhere on the page
// can expand this view, scroll to the exact turn, and flash-highlight the
// exact character span the quote came from — the same span the debrief
// compiler located, not a re-search done here.

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SessionPlan, SourceSpan, TranscriptTurn } from "@dryrun/core";
import styles from "./TranscriptView.module.css";

export type TranscriptViewHandle = {
  focusTurn: (turnIndex: number, span: SourceSpan) => void;
};

type TurnEntry = { turn: TranscriptTurn; index: number };
type Group = { key: string; label: string; questionText: string | null; turns: TurnEntry[] };

/**
 * Bucket the transcript by plan.questions order. Turns with no questionId
 * (the opening greeting, the closing wrap-up) have nothing to attach to, so
 * they are placed by position instead: before the first question-linked turn
 * they read as "Introduction", after the last as "Wrap-up". Real sessions
 * never interleave the two, so this is exact for the transcripts this build
 * produces — it is a positional grouping, not a receipt, which is why it
 * carries no citation of its own.
 */
function groupTranscript(plan: SessionPlan, transcript: TranscriptTurn[]): Group[] {
  const byQuestion = new Map<string, TurnEntry[]>();
  const questionIndices = new Set<number>();

  transcript.forEach((turn, index) => {
    if (turn.questionId === null) return;
    const list = byQuestion.get(turn.questionId) ?? [];
    list.push({ turn, index });
    byQuestion.set(turn.questionId, list);
    questionIndices.add(index);
  });

  let firstQuestionIndex = -1;
  let lastQuestionIndex = -1;
  transcript.forEach((_, index) => {
    if (!questionIndices.has(index)) return;
    if (firstQuestionIndex === -1) firstQuestionIndex = index;
    lastQuestionIndex = index;
  });

  const groups: Group[] = [];

  const intro = transcript
    .map((turn, index) => ({ turn, index }))
    .filter(
      ({ turn, index }) =>
        turn.questionId === null && (firstQuestionIndex === -1 || index < firstQuestionIndex),
    );
  if (intro.length > 0) {
    groups.push({ key: "intro", label: "Introduction", questionText: null, turns: intro });
  }

  for (const question of plan.questions) {
    const turns = byQuestion.get(question.id) ?? [];
    if (turns.length === 0) continue;
    groups.push({ key: question.id, label: question.id, questionText: question.question, turns });
  }

  const outro = transcript
    .map((turn, index) => ({ turn, index }))
    .filter(
      ({ turn, index }) => turn.questionId === null && lastQuestionIndex !== -1 && index > lastQuestionIndex,
    );
  if (outro.length > 0) {
    groups.push({ key: "outro", label: "Wrap-up", questionText: null, turns: outro });
  }

  return groups;
}

function renderHighlighted(text: string, span: SourceSpan): ReactNode {
  const before = text.slice(0, span.start);
  const middle = text.slice(span.start, span.end);
  const after = text.slice(span.end);
  return (
    <>
      {before}
      <mark className={styles.highlight}>{middle}</mark>
      {after}
    </>
  );
}

const TranscriptView = forwardRef<
  TranscriptViewHandle,
  { plan: SessionPlan; transcript: TranscriptTurn[] }
>(function TranscriptView({ plan, transcript }, ref) {
  const [expanded, setExpanded] = useState(false);
  const [highlight, setHighlight] = useState<{ turnIndex: number; span: SourceSpan; key: number } | null>(
    null,
  );
  const turnRefs = useRef(new Map<number, HTMLDivElement>());
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    focusTurn(turnIndex, span) {
      setExpanded(true);
      const key = Date.now();
      setHighlight({ turnIndex, span, key });
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => {
        setHighlight((current) => (current && current.key === key ? null : current));
      }, 1500);
      // Wait a tick so a just-expanded panel has laid out before we scroll.
      requestAnimationFrame(() => {
        turnRefs.current.get(turnIndex)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
  }));

  if (transcript.length === 0) return null;

  const groups = groupTranscript(plan, transcript);

  return (
    <section className={styles.wrap}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide full transcript" : "Show full transcript"}
      </button>

      {expanded && (
        <div className={styles.body}>
          {groups.map((group) => (
            <div key={group.key} className={styles.group}>
              <div className={styles.groupHead}>
                <span className={styles.groupLabel}>{group.label}</span>
                {group.questionText && <p className={styles.groupQuestion}>{group.questionText}</p>}
              </div>
              <div className={styles.turns}>
                {group.turns.map(({ turn, index }) => (
                  <div
                    key={index}
                    ref={(el) => {
                      if (el) turnRefs.current.set(index, el);
                      else turnRefs.current.delete(index);
                    }}
                    className={`${styles.turn} ${
                      turn.role === "candidate" ? styles.candidate : styles.interviewer
                    }`}
                  >
                    <span className={styles.role}>{turn.role}</span>
                    <p className={styles.text}>
                      {highlight && highlight.turnIndex === index
                        ? renderHighlighted(turn.text, highlight.span)
                        : turn.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

export default TranscriptView;

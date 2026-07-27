"use client";

// A compiled interview question. Paper: "QuestionCard-Conceptual" /
// "QuestionCard-Behavioral".
//
// The "because of <gap>" line is the question's receipt and is not optional
// furniture: a question whose gap can't be resolved is not rendered at all
// (see /plan), mirroring the server-side grounding guard. The STAR row appears
// exactly when the question is behavioral, which the schema guarantees is
// exactly when starHints exist.

import type { CompileResult, Gap, InterviewQuestion } from "@dryrun/core";
import { gapTitle, KIND_LABEL } from "../lib/receipts";
import styles from "./QuestionCard.module.css";

const STAR_BEATS = ["S", "T", "A", "R"] as const;

export default function QuestionCard({
  question,
  gap,
  compile,
  onViewReceipts,
}: {
  question: InterviewQuestion;
  gap: Gap;
  compile: CompileResult;
  onViewReceipts: () => void;
}) {
  const hints = question.starHints;
  const beats = hints ? [hints.situation, hints.task, hints.action, hints.result] : [];

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <span className={styles.qid}>{question.id}</span>
        <span className={styles.kind}>{question.kind}</span>
        <p className={styles.question}>{question.question}</p>
      </div>

      <div className={styles.receipt}>
        <span className={styles.because}>because of</span>
        <span className={`${styles.gapRef} ${styles[gap.kind]}`}>
          {gap.id} · {gapTitle(gap, compile)}
        </span>
        <button className={styles.viewReceipts} onClick={onViewReceipts}>
          view receipts →
        </button>
      </div>

      {hints && (
        <div className={styles.star}>
          {beats.map((beat, i) => (
            <span key={STAR_BEATS[i]} className={styles.beat}>
              {STAR_BEATS[i]} · {beat}
            </span>
          ))}
        </div>
      )}

      {!hints && question.kind === "conceptual" && (
        // Deliberately silent rather than showing an empty STAR row: a
        // conceptual question has no lived story to scaffold, so scaffolding
        // would be a prompt to invent one.
        <span className={styles.srOnly}>
          Conceptual question — no STAR scaffolding, because there is no story to tell.
        </span>
      )}

      <span className={styles.srOnly}>
        This question was compiled from a {KIND_LABEL[gap.kind]} gap. {question.rationale}
      </span>
    </article>
  );
}

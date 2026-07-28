"use client";

// One question's debrief: what the candidate covered, what they missed, and
// the receipt trail (question → gap → JD/resume spans) that produced the
// question in the first place.
//
// Every COVERED claim carries a QuoteChip — that is the rule the whole module
// enforces upstream (see packages/core/src/debrief). MISSED claims carry none,
// on purpose: you cannot quote an absence, the same precedent as a
// missing_skill gap's null resume receipt.

import type { Gap, InterviewQuestion, QuestionDebrief, SessionPlan } from "@dryrun/core";
import { gapForQuestion } from "../lib/session-state";
import QuoteChip from "./QuoteChip";
import styles from "./DebriefRow.module.css";

export default function DebriefRow({
  plan,
  question,
  debrief,
  onViewReceipts,
}: {
  plan: SessionPlan;
  question: InterviewQuestion;
  debrief: QuestionDebrief;
  onViewReceipts: (gap: Gap, question: InterviewQuestion) => void;
}) {
  // Unreachable in practice — compileSessionPlan guards this at compile time —
  // but a receipt that can't be resolved is rendered as absent, never faked.
  const gap = gapForQuestion(plan, question);

  return (
    <article className={styles.row}>
      <div className={styles.head}>
        <span className={styles.qid}>{question.id}</span>
        <span className={styles.kind}>{question.kind}</span>
        <p className={styles.question}>{question.question}</p>
      </div>

      {!debrief.attempted ? (
        <p className={styles.notAttempted}>no claims made — nothing to cite</p>
      ) : (
        <div className={styles.body}>
          <p className={styles.summary}>{debrief.summary}</p>

          {debrief.covered.length > 0 && (
            <div className={styles.block}>
              <span className={styles.blockLabel}>covered</span>
              <ul className={styles.list}>
                {debrief.covered.map((point, i) => (
                  <li key={i} className={styles.item}>
                    <span className={styles.claim}>{point.claim}</span>
                    <QuoteChip quote={point.quote} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {debrief.missed.length > 0 && (
            <div className={styles.block}>
              <span className={`${styles.blockLabel} ${styles.blockLabelMissed}`}>missed</span>
              <ul className={styles.list}>
                {debrief.missed.map((point, i) => (
                  <li key={i} className={styles.itemMissed}>
                    {point.claim}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {debrief.covered.length === 0 && debrief.missed.length === 0 && (
            <p className={styles.notAttempted}>nothing to report for this answer</p>
          )}
        </div>
      )}

      {gap && (
        <div className={styles.footer}>
          <span className={styles.target}>targets {gap.id} ·</span>
          <button type="button" className={styles.viewReceipts} onClick={() => onViewReceipts(gap, question)}>
            view receipts →
          </button>
        </div>
      )}
    </article>
  );
}

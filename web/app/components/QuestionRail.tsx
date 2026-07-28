"use client";

// The left rail: every question in the plan, in order, with a status dot
// (done / current / upcoming) and a "why this question" affordance that opens
// the same ReceiptsDrawer /plan uses — the receipt for a question doesn't
// change just because you're now rehearsing it instead of reading it.

import type { Gap, InterviewQuestion, SessionPlan } from "@dryrun/core";
import { gapForQuestion } from "../lib/session-state";
import styles from "./QuestionRail.module.css";

type Status = "done" | "current" | "upcoming";

const STATUS_ITEM_CLASS: Record<Status, string> = {
  done: "itemDone",
  current: "itemCurrent",
  upcoming: "itemUpcoming",
};

const STATUS_DOT_CLASS: Record<Status, string> = {
  done: "dotDone",
  current: "dotCurrent",
  upcoming: "dotUpcoming",
};

function shortLabel(question: string): string {
  const trimmed = question.trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 40).trimEnd()}…` : trimmed;
}

export default function QuestionRail({
  plan,
  currentIndex,
  wrapped,
  onViewReceipts,
}: {
  plan: SessionPlan;
  currentIndex: number;
  /** Once the session is wrapped, the current question reads as done too. */
  wrapped: boolean;
  onViewReceipts: (question: InterviewQuestion, gap: Gap) => void;
}) {
  return (
    <nav className={styles.rail} aria-label="Interview questions">
      {plan.questions.map((question, i) => {
        const status: Status =
          i < currentIndex || (wrapped && i === currentIndex)
            ? "done"
            : i === currentIndex
              ? "current"
              : "upcoming";
        const gap = gapForQuestion(plan, question);

        return (
          <div key={question.id} className={`${styles.item} ${styles[STATUS_ITEM_CLASS[status]]}`}>
            <span className={`${styles.dot} ${styles[STATUS_DOT_CLASS[status]]}`} aria-hidden="true" />
            <div className={styles.body}>
              <span className={styles.qid}>{question.id}</span>
              <p className={styles.label}>{shortLabel(question.question)}</p>
              {gap && (
                <button
                  type="button"
                  className={styles.why}
                  onClick={() => onViewReceipts(question, gap)}
                >
                  why this question →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

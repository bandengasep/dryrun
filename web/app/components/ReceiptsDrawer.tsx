"use client";

// The shared receipts drawer — /plan opens it from a question, /debrief will
// open it from a quote chip. One component, because "show me what this is
// based on" is one gesture wherever it happens.
//
// It shows the JD span and the resume span side by side, verbatim. The
// side-by-side is the argument: a gap is a difference between two documents, so
// seeing one line without the other proves nothing.

import { useEffect, useRef } from "react";
import type { CompileResult, Gap, InterviewQuestion } from "@dryrun/core";
import GapKindChip from "./GapKindChip";
import ReceiptCitation from "./ReceiptCitation";
import { gapTitle } from "../lib/receipts";
import styles from "./ReceiptsDrawer.module.css";

export default function ReceiptsDrawer({
  gap,
  question,
  compile,
  onClose,
}: {
  gap: Gap | null;
  /** Present when opened from a question rather than from the gap itself. */
  question?: InterviewQuestion | null;
  compile: CompileResult;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gap) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [gap, onClose]);

  if (!gap) return null;

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Receipts"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <span className="kicker">Receipts</span>
          <button className={styles.close} onClick={onClose} aria-label="Close receipts">
            ✕
          </button>
        </div>

        {question && (
          <div className={styles.question}>
            <span className={styles.qid}>{question.id}</span>
            <p className={styles.questionText}>{question.question}</p>
          </div>
        )}

        <div className={styles.gapHead}>
          <GapKindChip kind={gap.kind} />
          <span className={styles.gapTitle}>{gapTitle(gap, compile)}</span>
          <span className={styles.gapId}>{gap.id}</span>
        </div>

        <div className={styles.citations}>
          <div className={styles.column}>
            <span className={styles.columnLabel}>What the job asks for</span>
            <ReceiptCitation
              source="jd"
              sourceText={compile.jd.sourceText}
              span={gap.jdSpan}
              emphasis
            />
          </div>
          <div className={styles.column}>
            <span className={styles.columnLabel}>What your resume says</span>
            <ReceiptCitation
              source="resume"
              sourceText={compile.resume.sourceText}
              span={gap.resumeSpan}
              absence={`no evidence located — ${gap.rationale}`}
            />
          </div>
        </div>

        {question && (
          <div className={styles.rationale}>
            <span className={styles.columnLabel}>Why this gap produces this question</span>
            <p className={styles.rationaleText}>{question.rationale}</p>
          </div>
        )}

        <p className={styles.footnote}>
          Quoted verbatim from the documents you pasted, located by character offset.
          Nothing here is paraphrased.
        </p>
      </div>
    </div>
  );
}

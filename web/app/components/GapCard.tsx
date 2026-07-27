"use client";

// A gap, collapsed to one row or expanded to show both receipts.
//
// Paper draws these as two components ("GapRow-Weak" and
// "GapCard-Missing-Expanded"); they are one component here because they are one
// thing in two states, and the collapsed row's whole job is to be openable.
// Collapsed, the row still names both citations (gap-2 · JD L17 ↔ resume L9),
// so even the summary view carries the trace.

import type { CompileResult, Gap } from "@dryrun/core";
import GapKindChip from "./GapKindChip";
import ReceiptCitation from "./ReceiptCitation";
import { gapTitle, lineNumberFor } from "../lib/receipts";
import styles from "./GapCard.module.css";

export default function GapCard({
  gap,
  compile,
  expanded,
  onToggle,
}: {
  gap: Gap;
  compile: CompileResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const title = gapTitle(gap, compile);
  const jdLine = lineNumberFor(compile.jd.sourceText, gap.jdSpan);
  const resumeRef = gap.resumeSpan
    ? `resume L${lineNumberFor(compile.resume.sourceText, gap.resumeSpan)}`
    : "resume silent";

  return (
    <div className={`${styles.card} ${expanded ? styles.cardExpanded : ""}`}>
      <button
        className={styles.head}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`${gap.id}-receipts`}
      >
        <GapKindChip kind={gap.kind} />
        <span className={styles.title}>{title}</span>
        <span className={styles.trace}>
          {gap.id} · JD L{jdLine} ↔ {resumeRef}
        </span>
        <span className={styles.caret} aria-hidden="true">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div className={styles.receipts} id={`${gap.id}-receipts`}>
          <ReceiptCitation
            source="jd"
            sourceText={compile.jd.sourceText}
            span={gap.jdSpan}
            emphasis
          />
          <ReceiptCitation
            source="resume"
            sourceText={compile.resume.sourceText}
            span={gap.resumeSpan}
            // An absence has nothing to quote, so this line is reasoning rather
            // than a receipt — and is labelled as reasoning, never as a citation.
            absence={`no evidence located — ${gap.rationale}`}
          />
        </div>
      )}
    </div>
  );
}

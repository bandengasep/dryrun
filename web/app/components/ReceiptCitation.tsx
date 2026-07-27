"use client";

// One receipt row: a fixed-width source label, then the verbatim span.
//
// The label column is a fixed 64px slot so JD and RESUME labels form one lane
// and the quotes start on the same x — the two documents read as a comparison
// rather than as two paragraphs.
//
// The quote is rendered from `span.text` and checked against the source the
// client holds. If they disagree the row says so instead of quoting: a receipt
// that can't be verified is worth less than an admission that it can't.

import type { SourceSpan } from "@dryrun/core";
import { lineNumberFor, spanMatchesSource } from "../lib/receipts";
import styles from "./ReceiptCitation.module.css";

export default function ReceiptCitation({
  source,
  sourceText,
  span,
  /** Shown in place of a quote when the document has nothing to cite. */
  absence,
  emphasis = false,
}: {
  source: "jd" | "resume";
  sourceText: string;
  span: SourceSpan | null;
  absence?: string;
  /** The JD side of a gap is the demand — it carries the ink-blue label. */
  emphasis?: boolean;
}) {
  const label =
    span && source === "jd"
      ? `JD L${lineNumberFor(sourceText, span)}`
      : span
        ? `L${lineNumberFor(sourceText, span)}`
        : source === "jd"
          ? "JD"
          : "RESUME";

  const verified = span ? spanMatchesSource(sourceText, span) : true;

  return (
    <div className={styles.row}>
      <span className={`${styles.label} ${emphasis ? styles.labelEmphasis : ""}`}>{label}</span>
      {span ? (
        verified ? (
          <q className={styles.quote}>{span.text}</q>
        ) : (
          <span className={styles.unverified}>
            this quote no longer matches the document it cites — withheld
          </span>
        )
      ) : (
        <span className={styles.absence}>{absence ?? "no evidence located"}</span>
      )}
    </div>
  );
}

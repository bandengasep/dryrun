"use client";

// A verbatim quote from the candidate's own transcript, rendered as a small
// evidence-face chip. Clicking it is the receipt gesture for a debrief claim:
// it does not just assert the quote exists, it jumps you to it.
//
// The quote text comes straight from `quote.span.text` — the same character
// span the debrief compiler re-located in the real transcript — so this chip
// can never show words the candidate didn't say.

import { useQuoteFocus } from "./DebriefView";
import type { TranscriptQuote } from "@dryrun/core";
import styles from "./QuoteChip.module.css";

const MAX_CHARS = 90;

function truncate(text: string): string {
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS - 1).trimEnd()}…`;
}

export default function QuoteChip({ quote }: { quote: TranscriptQuote }) {
  const focusQuote = useQuoteFocus();
  const text = quote.span.text;

  return (
    <button
      type="button"
      className={styles.chip}
      title={text}
      onClick={() => focusQuote(quote)}
    >
      <q className={styles.quote}>{truncate(text)}</q>
      <span className={styles.marker}>turn {quote.turnIndex}</span>
    </button>
  );
}

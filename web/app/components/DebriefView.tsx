"use client";

// The debrief surface, pure over its props: {plan, transcript, debrief,
// readOnly?}. Used both live at /debrief (client-fetched) and read-only at
// /debrief/[id] (server-loaded) — this component never fetches or dispatches
// anything itself, which is what makes it safe to render from a server
// component's data straight into a client boundary.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type {
  DebriefReport,
  Gap,
  InterviewQuestion,
  QuestionDebrief,
  SessionPlan,
  TranscriptQuote,
  TranscriptTurn,
} from "@dryrun/core";
import { planToCompileShape } from "../lib/receipts";
import DebriefRow from "./DebriefRow";
import TranscriptView, { type TranscriptViewHandle } from "./TranscriptView";
import ReceiptsDrawer from "./ReceiptsDrawer";
import styles from "./DebriefView.module.css";

type QuoteFocusHandler = (quote: TranscriptQuote) => void;

// Lets a QuoteChip nested inside a DebriefRow reach the single TranscriptView
// lower on the page without threading a ref through every layer in between.
const QuoteFocusContext = createContext<QuoteFocusHandler>(() => {});
export function useQuoteFocus(): QuoteFocusHandler {
  return useContext(QuoteFocusContext);
}

function answeredCount(debrief: DebriefReport): number {
  return debrief.perQuestion.filter((q) => q.attempted).length;
}

/**
 * Total recorded time, derived only from video turns' own timed words — never
 * guessed for text answers, which carry no duration signal at all. Returns
 * null (rather than 0) when there is nothing to derive it from, so the caller
 * can omit the figure instead of claiming a zero-second session.
 */
function totalRecordedSeconds(transcript: TranscriptTurn[]): number | null {
  const videoTurns = transcript.filter(
    (t) => t.mode === "video" && t.timedWords && t.timedWords.length > 0,
  );
  if (videoTurns.length === 0) return null;
  let total = 0;
  for (const turn of videoTurns) {
    const words = turn.timedWords!;
    total += words[words.length - 1]!.end - words[0]!.start;
  }
  return total;
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function DebriefView({
  plan,
  transcript,
  debrief,
  readOnly = false,
}: {
  plan: SessionPlan;
  transcript: TranscriptTurn[];
  debrief: DebriefReport;
  readOnly?: boolean;
}) {
  const transcriptRef = useRef<TranscriptViewHandle>(null);
  const [drawer, setDrawer] = useState<{ gap: Gap; question: InterviewQuestion } | null>(null);

  const focusQuote = useCallback<QuoteFocusHandler>((quote) => {
    transcriptRef.current?.focusTurn(quote.turnIndex, quote.span);
  }, []);

  // ReceiptsDrawer wants a CompileResult; a SessionPlan carries everything it
  // reads (sourceText + gap spans) but not the exact shape, so this reshapes
  // rather than duplicating the drawer for /debrief.
  const compileShape = useMemo(() => planToCompileShape(plan), [plan]);

  const debriefByQuestion = useMemo(() => {
    const map = new Map<string, QuestionDebrief>();
    for (const q of debrief.perQuestion) map.set(q.questionId, q);
    return map;
  }, [debrief]);

  const answered = answeredCount(debrief);
  const duration = totalRecordedSeconds(transcript);
  const droppedCount = debrief.dropped.length;

  return (
    <QuoteFocusContext.Provider value={focusQuote}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <p className="kicker">
            {answered} of {plan.questions.length} answered
            {duration !== null ? ` · ${formatDuration(duration)} recorded` : ""}
            {readOnly ? " · read-only" : ""}
          </p>
          <h1 className={styles.title}>What you said — quoted, not graded</h1>
        </header>

        <div className={styles.rows}>
          {plan.questions.map((question) => {
            const qDebrief = debriefByQuestion.get(question.id);
            if (!qDebrief) return null;
            return (
              <DebriefRow
                key={question.id}
                plan={plan}
                question={question}
                debrief={qDebrief}
                onViewReceipts={(gap, q) => setDrawer({ gap, question: q })}
              />
            );
          })}
        </div>

        <TranscriptView ref={transcriptRef} plan={plan} transcript={transcript} />

        <p className={styles.honesty}>
          {droppedCount === 0
            ? "0 claims withheld — every displayed claim passed mechanical quote validation."
            : `${droppedCount} claim${droppedCount === 1 ? "" : "s"} failed mechanical quote validation and ${
                droppedCount === 1 ? "was" : "were"
              } withheld.`}
        </p>
      </div>

      <ReceiptsDrawer
        gap={drawer?.gap ?? null}
        question={drawer?.question ?? null}
        compile={compileShape}
        onClose={() => setDrawer(null)}
      />
    </QuoteFocusContext.Provider>
  );
}

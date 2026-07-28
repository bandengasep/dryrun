"use client";

// The rehearsal room. All the machinery — questionIndex, follow-up caps,
// streaming, failover — lives in useInterviewSession; this page is purely
// the arrangement: a QuestionRail down the left, the live ChatStream in the
// center, and a composer (or the wrapped/error panel that replaces it) at the
// bottom.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Gap, InterviewQuestion } from "@dryrun/core";
import { useSession } from "../lib/session-state";
import { useInterviewSession, type UsageInfo } from "./useInterviewSession";
import { MockBanner } from "../lib/mock";
import ChatStream from "../components/ChatStream";
import AnswerComposer from "../components/AnswerComposer";
import QuestionRail from "../components/QuestionRail";
import ProviderChip from "../components/ProviderChip";
import ReceiptsDrawer from "../components/ReceiptsDrawer";
import styles from "./session.module.css";

function usageTokenCount(usage: UsageInfo | null): number | null {
  if (!usage || typeof usage.usage !== "object" || usage.usage === null) return null;
  const total = (usage.usage as Record<string, unknown>).total_tokens;
  return typeof total === "number" ? total : null;
}

export default function SessionScreen() {
  const router = useRouter();
  const { compile } = useSession();
  const {
    plan,
    transcript,
    phase,
    currentQuestionIndex,
    followupsUsed,
    maxFollowups,
    streamingText,
    provider,
    usage,
    error,
    draft,
    setDraft,
    sendAnswer,
    retry,
    isMock,
  } = useInterviewSession();

  const [drawer, setDrawer] = useState<{ gap: Gap; question: InterviewQuestion } | null>(null);
  const [endConfirm, setEndConfirm] = useState(false);

  // No plan compiled — same "start upstream" guard /plan uses when it has no
  // compile yet.
  if (!plan) {
    return (
      <main className="app-main">
        <div className={styles.guard}>
          <p className="kicker">Rehearsal</p>
          <h1 className={`display-2 ${styles.guardTitle}`}>No session plan yet</h1>
          <p className={`lead ${styles.guardSubtitle}`}>
            The rehearsal room runs on a compiled interview. Compile one first and this page fills
            itself in.
          </p>
          <button onClick={() => router.push("/plan")} className="btn btn-primary btn-lg">
            Go to your plan →
          </button>
        </div>
      </main>
    );
  }

  const tokenCount = usageTokenCount(usage);
  const canOpenReceipts = compile !== null;

  return (
    <main className="app-main">
      {isMock && <MockBanner />}

      <div className={styles.shell}>
        <aside className={styles.railWrap}>
          <QuestionRail
            plan={plan}
            currentIndex={currentQuestionIndex}
            wrapped={phase === "wrapped"}
            onViewReceipts={
              canOpenReceipts
                ? (question, gap) => setDrawer({ gap, question })
                : () => {}
            }
          />
        </aside>

        <div className={styles.main}>
          <div className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <span className="kicker">Rehearsal</span>
              <span className={`mono ${styles.progress}`}>
                question {Math.min(currentQuestionIndex + 1, plan.questions.length)} of{" "}
                {plan.questions.length}
              </span>
            </div>
            <div className={styles.topbarRight}>
              {!isMock && <ProviderChip provider={provider} />}
              {tokenCount !== null && (
                <span className={`mono ${styles.usage}`}>this turn: {tokenCount} tokens</span>
              )}
              {!endConfirm ? (
                <button
                  type="button"
                  className={styles.endQuiet}
                  onClick={() => setEndConfirm(true)}
                >
                  End session → debrief
                </button>
              ) : (
                <span className={styles.endConfirmRow}>
                  <span className={styles.endConfirmLabel}>End without the rest?</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => router.push("/debrief")}
                  >
                    Yes, go to debrief
                  </button>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => setEndConfirm(false)}
                  >
                    Cancel
                  </button>
                </span>
              )}
            </div>
          </div>

          <ChatStream
            transcript={transcript}
            streamingText={streamingText}
            isStreaming={phase === "asking"}
          />

          {phase === "error" && (
            <div className={styles.errorBanner} role="alert">
              <div>
                <p className={styles.errorTitle}>The interviewer didn’t respond.</p>
                <p className={styles.errorMessage}>{error}</p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={retry}>
                Retry this turn
              </button>
            </div>
          )}

          {phase === "wrapped" && (
            <div className={styles.wrappedPanel}>
              <div>
                <h2 className={styles.wrappedTitle}>Session complete</h2>
                <p className={styles.wrappedBody}>
                  Nothing here was scored. The debrief quotes what you actually said, question by
                  question.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-lg btn-shadow"
                onClick={() => router.push("/debrief")}
              >
                Go to your debrief →
              </button>
            </div>
          )}

          {phase !== "wrapped" && (
            <AnswerComposer
              value={draft}
              onChange={setDraft}
              onSend={sendAnswer}
              canSend={phase === "awaiting_answer" && draft.trim().length > 0}
              followUpLabel={
                phase === "awaiting_answer" && followupsUsed > 0
                  ? `follow-up ${followupsUsed} of ${maxFollowups}`
                  : null
              }
            />
          )}
        </div>
      </div>

      {compile && (
        <ReceiptsDrawer
          gap={drawer?.gap ?? null}
          question={drawer?.question ?? null}
          compile={compile}
          onClose={() => setDrawer(null)}
        />
      )}
    </main>
  );
}

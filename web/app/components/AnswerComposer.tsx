"use client";

// The candidate's reply box. Deliberately dumb: it owns no session logic,
// just the textarea's grow-with-content behaviour and the Cmd/Ctrl+Enter
// shortcut — useInterviewSession decides whether sending is currently allowed.
// Mic dictation lives here for the same reason: it's input mechanics (a
// segment of text landing in the draft for the candidate to review before
// sending), not a session decision, so it stays out of useInterviewSession.

import { useEffect, useRef, type KeyboardEvent } from "react";
import styles from "./AnswerComposer.module.css";
import { useSpeechDictation } from "./useSpeechDictation";

// NEXT_PUBLIC_* is inlined at build time, so an absent flag compiles the mic
// branch away entirely rather than just hiding it at runtime.
const MIC_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MIC === "1";

export default function AnswerComposer({
  value,
  onChange,
  onSend,
  canSend,
  followUpLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  /** False while streaming, while wrapped/errored, or while the draft is empty. */
  canSend: boolean;
  /** e.g. "follow-up 1 of 2" — null outside a follow-up. */
  followUpLabel: string | null;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grows with content rather than scrolling internally, up to a sane cap
  // handled by the CSS max-height.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  const { supported, listening, error, toggle } = useSpeechDictation((segment) =>
    onChange(value ? `${value} ${segment}` : segment),
  );
  const micVisible = MIC_ENABLED && supported;

  return (
    <div className={styles.composer}>
      {followUpLabel && <span className={`mono ${styles.followUp}`}>{followUpLabel}</span>}
      <div className={styles.row}>
        <textarea
          ref={ref}
          className={`textarea ${styles.textarea}`}
          rows={3}
          placeholder="Type your answer — Cmd/Ctrl+Enter to send"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {micVisible && (
          <button
            type="button"
            className={`${styles.micButton} ${listening ? styles.micButtonListening : ""}`}
            onClick={toggle}
            aria-pressed={listening}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
          >
            <span
              className={`${styles.micDot} ${listening ? styles.micDotListening : ""}`}
              aria-hidden="true"
            />
            {listening ? "Listening…" : "Dictate"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onSend}
          disabled={!canSend}
        >
          Send
        </button>
      </div>
      {micVisible && (listening || error) && (
        <p className={`${styles.micNote} ${error ? styles.micNoteError : ""}`}>
          {error ??
            "Dictation uses your browser's speech recognizer and may send audio to the browser vendor. Nothing is stored by DryRun until Save & share."}
        </p>
      )}
    </div>
  );
}

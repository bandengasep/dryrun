"use client";

// The candidate's reply box. Deliberately dumb: it owns no session logic,
// just the textarea's grow-with-content behaviour and the Cmd/Ctrl+Enter
// shortcut — useInterviewSession decides whether sending is currently allowed.

import { useEffect, useRef, type KeyboardEvent } from "react";
import styles from "./AnswerComposer.module.css";

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
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onSend}
          disabled={!canSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}

"use client";

// The rehearsal transcript, rendered as a chat log: interviewer turns on the
// left with a small avatar dot, candidate turns on the right on an elevated
// surface — the same "who said this" grammar a real call would use. The
// currently-streaming reply gets its own bubble with a trailing caret; its
// text is already sentinel-stripped by the caller (useInterviewSession passes
// `splitReplyAndMeta(buffer).reply`, never the raw buffer), so a `META:` line
// can never flash on screen mid-stream.

import { useEffect, useRef } from "react";
import type { TranscriptTurn } from "@dryrun/core";
import styles from "./ChatStream.module.css";

export default function ChatStream({
  transcript,
  streamingText,
  isStreaming,
}: {
  transcript: TranscriptTurn[];
  /** Cleaned text of the reply in flight — empty string before the first token lands. */
  streamingText: string;
  isStreaming: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Sticks to the newest message unless the reader has scrolled up to look at
  // something earlier — a new token shouldn't yank them back down.
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [transcript, streamingText]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distanceFromBottom < 80;
  };

  const showEmpty = transcript.length === 0 && !isStreaming;

  return (
    <div className={styles.stream} ref={scrollRef} onScroll={onScroll} aria-live="polite">
      {transcript.map((turn, i) => (
        <Row key={i} role={turn.role} text={turn.text} />
      ))}

      {isStreaming && (
        <Row role="interviewer" text={streamingText} streaming />
      )}

      {showEmpty && <p className={styles.empty}>The interviewer is about to ask the first question.</p>}
    </div>
  );
}

function Row({
  role,
  text,
  streaming,
}: {
  role: TranscriptTurn["role"];
  text: string;
  streaming?: boolean;
}) {
  const isCandidate = role === "candidate";
  return (
    <div className={`${styles.row} ${isCandidate ? styles.rowCandidate : styles.rowInterviewer}`}>
      {!isCandidate && <span className={styles.avatarDot} aria-hidden="true" />}
      <div className={`${styles.bubble} ${isCandidate ? styles.bubbleCandidate : styles.bubbleInterviewer}`}>
        {text || (streaming ? <span className={styles.thinking}>thinking</span> : null)}
        {streaming && <span className={styles.caret} aria-hidden="true">▍</span>}
      </div>
    </div>
  );
}

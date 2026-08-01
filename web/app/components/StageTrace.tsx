"use client";

// The compile trace, from the Paper artboard "compile — stage trace states".
//
// This replaces a spinner, and the difference is the point: every row is a real
// pipeline stage emitted around a real await in /api/compile, and every number
// beside a row is counted from that stage's actual output. Nothing here is on a
// timer. A stage that hasn't started stays "·" — including "compile session
// plan", which genuinely doesn't run until /plan mounts.

import { useEffect, useState } from "react";
import styles from "./StageTrace.module.css";

export type StageStatus = "pending" | "running" | "done";

export type StageRow = {
  key: string;
  label: string;
  /** Counted from the stage's own output. Absent until there is something to count. */
  detail?: string;
  status: StageStatus;
};

const MARKER: Record<StageStatus, string> = {
  done: "✓",
  running: "▸",
  pending: "·",
};

/** mm:ss since `startedAt`, ticking while `running`. */
function Elapsed({ startedAt, running }: { startedAt: number; running: boolean }) {
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span className={styles.elapsed}>
      {mm}:{ss}
    </span>
  );
}

function LoaderDots() {
  return (
    <span className={styles.loader} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function StageTrace({
  stages,
  startedAt,
  running,
  note,
}: {
  stages: StageRow[];
  startedAt: number;
  running: boolean;
  /** Honesty line under the trace — e.g. quotes the parser could not anchor. */
  note?: string;
}) {
  return (
    <div className={styles.card} role="status" aria-live="polite">
      <div className={styles.head}>
        <span className="kicker">Compiling your interview</span>
        <Elapsed startedAt={startedAt} running={running} />
      </div>

      {stages.map((stage) => (
        <div key={stage.key} className={styles.row}>
          <span className={`${styles.marker} ${styles[stage.status]}`} aria-hidden="true">
            {MARKER[stage.status]}
          </span>
          <span
            className={`${styles.label} ${stage.status === "pending" ? styles.labelPending : ""}`}
          >
            {stage.label}
            {stage.status === "running" && <LoaderDots />}
          </span>
          {stage.detail && <span className={styles.detail}>{stage.detail}</span>}
        </div>
      ))}

      <p className={styles.footnote}>
        {note ?? "Every line above is a real pipeline stage — receipts are being located, not invented."}
      </p>
    </div>
  );
}

"use client";

// The one place in the product that writes to a server. Everything else is
// client-held (AGENTS.md rule 3); this button is the explicit exception, and
// its caption says so before the click, not after.

import { useState } from "react";
import type { DebriefReport, SessionPlan, TranscriptTurn } from "@dryrun/core";
import styles from "./SaveShareButton.module.css";

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved"; url: string }
  | { phase: "error"; message: string };

export default function SaveShareButton({
  plan,
  transcript,
  debrief,
}: {
  plan: SessionPlan;
  transcript: TranscriptTurn[];
  debrief: DebriefReport;
}) {
  const [state, setState] = useState<SaveState>({ phase: "idle" });
  const [copied, setCopied] = useState(false);

  const save = async () => {
    setState({ phase: "saving" });
    try {
      const res = await fetch("/api/session/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, transcript, debrief }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          res.status === 503
            ? "storage is unreachable — your debrief is still here locally"
            : typeof body?.error === "string"
              ? body.error
              : `Save failed with ${res.status}.`;
        setState({ phase: "error", message });
        return;
      }
      setState({ phase: "saved", url: String(body.url) });
    } catch (e) {
      setState({ phase: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  const copyLink = async (absoluteUrl: string) => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied (permissions, insecure context). The
      // link is still on screen and selectable by hand.
    }
  };

  if (state.phase === "saved") {
    const absoluteUrl =
      typeof window !== "undefined" ? `${window.location.origin}${state.url}` : state.url;
    return (
      <div className={styles.wrap}>
        <div className={styles.saved}>
          <span className={styles.savedLabel}>saved</span>
          <a href={state.url} className={styles.link}>
            {absoluteUrl}
          </a>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void copyLink(absoluteUrl)}
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
        <p className={styles.caption}>anyone with the link can view</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={() => void save()}
        disabled={state.phase === "saving"}
      >
        {state.phase === "saving" ? "Saving…" : "Save & share debrief"}
      </button>
      <p className={styles.caption}>nothing is stored unless you save · anyone with the link can view</p>

      {state.phase === "error" && (
        <div className={styles.errorBox} role="alert">
          <p className={styles.errorMessage}>{state.message}</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void save()}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

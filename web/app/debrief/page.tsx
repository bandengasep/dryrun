"use client";

// "What you said — quoted, not graded" — the last of the four stages.
//
// Nothing here scores or grades (AGENTS.md rule 2). It asks the debrief
// compiler once, over the client-held {plan, transcript}, and renders exactly
// what comes back: coverage claims that each quote the candidate, absences
// that don't, and a visible count of anything that failed to mechanically
// re-locate. Save & share is the one deliberate write in the whole product,
// and it only appears once there is a debrief to save.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DebriefReport } from "@dryrun/core";
import { useSession, useSessionDispatch } from "../lib/session-state";
import { ensureMockFlagFromUrl, mockDebrief, mockEnabled, MockBanner } from "../lib/mock";
import DebriefView from "../components/DebriefView";
import SaveShareButton from "../components/SaveShareButton";
import styles from "./debrief.module.css";

type DebriefStatus =
  | { phase: "idle" }
  | { phase: "compiling" }
  | { phase: "ready" }
  // A 422 "structure" kind means the model produced something the grounding
  // guard refused to ship — distinct from an outage, worth its own copy.
  | { phase: "error"; message: string; kind: "structure" | "generic" };

export default function DebriefPage() {
  const router = useRouter();
  const { plan, transcript, debrief } = useSession();
  const dispatch = useSessionDispatch();

  const [status, setStatus] = useState<DebriefStatus>({ phase: "idle" });
  const [usingMock, setUsingMock] = useState(false);

  // React 19 Strict Mode mounts effects twice in dev; without this the
  // debrief compiles twice and we pay for it twice.
  const requested = useRef(false);

  useEffect(() => {
    ensureMockFlagFromUrl();
  }, []);

  const hasCandidateTurn = transcript.some((t) => t.role === "candidate");

  const runCompile = useCallback(async () => {
    if (!plan) return;
    setStatus({ phase: "compiling" });

    if (mockEnabled()) {
      setUsingMock(true);
      const report = mockDebrief(plan, transcript);
      dispatch({ type: "debrief/set", debrief: report });
      setStatus({ phase: "ready" });
      return;
    }

    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, transcript }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus({
          phase: "error",
          message:
            typeof body?.error === "string" ? body.error : `The debrief service returned ${res.status}.`,
          kind: body?.kind === "structure" ? "structure" : "generic",
        });
        return;
      }
      dispatch({ type: "debrief/set", debrief: body.debrief as DebriefReport });
      setStatus({ phase: "ready" });
    } catch (e) {
      setStatus({
        phase: "error",
        message: e instanceof Error ? e.message : String(e),
        kind: "generic",
      });
    }
  }, [plan, transcript, dispatch]);

  useEffect(() => {
    if (!plan || !hasCandidateTurn || debrief || requested.current) return;
    requested.current = true;
    void runCompile();
  }, [plan, hasCandidateTurn, debrief, runCompile]);

  const retry = () => {
    requested.current = true;
    void runCompile();
  };

  // No plan compiled at all — arriving here directly, or storage was cleared.
  if (!plan) {
    return (
      <main className="app-main">
        <div className={styles.content}>
          <p className="kicker">Debrief</p>
          <h1 className={`display-2 ${styles.title}`}>Nothing to debrief yet</h1>
          <p className={`lead ${styles.subtitle}`}>
            A debrief is built from a rehearsed session. Compile a plan first and this page fills
            itself in once you&apos;ve answered something.
          </p>
          <button onClick={() => router.push("/plan")} className="btn btn-primary btn-lg">
            Go to your plan →
          </button>
        </div>
      </main>
    );
  }

  // A plan exists but the candidate never spoke — nothing for the debrief
  // compiler to work with, and inviting a verdict on silence invites invention.
  if (!hasCandidateTurn) {
    return (
      <main className="app-main">
        <div className={styles.content}>
          <p className="kicker">Debrief</p>
          <h1 className={`display-2 ${styles.title}`}>Nothing to debrief yet</h1>
          <p className={`lead ${styles.subtitle}`}>
            You haven&apos;t answered a question in this session yet. Rehearse at least one and
            come back.
          </p>
          <button onClick={() => router.push("/session")} className="btn btn-primary btn-lg">
            Go to the session →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main">
      <div className={styles.content}>
        {usingMock && <MockBanner />}

        {status.phase === "compiling" && !debrief && (
          <div className={styles.skeleton} aria-busy="true">
            <div className={styles.skeletonBar} />
            <div className={styles.skeletonBar} />
            <div className={styles.skeletonBar} />
            <p className={styles.skeletonNote}>Compiling your debrief — typically ~25 seconds.</p>
          </div>
        )}

        {status.phase === "error" && !debrief && (
          <div className={styles.errorBox} role="alert">
            <p className={styles.errorTitle}>
              {status.kind === "structure"
                ? "The debrief came back malformed — this is on us."
                : "The debrief didn't compile."}
            </p>
            <p className={styles.errorMessage}>{status.message}</p>
            <p className={styles.errorHint}>
              {status.kind === "structure"
                ? "The grounding guard refused to display it. Retrying re-runs only the debrief compile — your session is untouched."
                : "Retrying re-runs only the debrief compile — nothing in your session is lost."}
            </p>
            <button onClick={retry} className="btn btn-outline btn-sm">
              Retry
            </button>
          </div>
        )}

        {debrief && (
          <>
            <DebriefView plan={plan} transcript={transcript} debrief={debrief} />
            <SaveShareButton plan={plan} transcript={transcript} debrief={debrief} />
          </>
        )}
      </div>
    </main>
  );
}

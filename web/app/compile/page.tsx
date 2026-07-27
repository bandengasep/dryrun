"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompileResult } from "@dryrun/core";
import { readSSE } from "../lib/stream";
import { useSessionDispatch } from "../lib/session-state";
import StageTrace, { type StageRow } from "../components/StageTrace";
import styles from "./compile.module.css";

const SAMPLE_JD =
  "Senior Backend Engineer. You will design scalable distributed systems and REST APIs. " +
  "Strong Python and SQL required. Experience with system design, algorithms, AWS and Docker. 5+ years.";
const SAMPLE_RESUME =
  "Software engineer with 3 years building Python services and REST APIs. " +
  "Comfortable with Docker and some SQL. Built graph and tree algorithms at university.";

/**
 * The trace mirrors what /api/compile actually emits, which is two stages: the
 * two parses run in one Promise.all, and the diff follows.
 *
 * The two parses are shown as separate rows because they produce separate,
 * separately-countable outputs — but they flip to ✓ together, because that is
 * genuinely when we learn both finished. The fourth row is the plan compile,
 * which does not run here at all: it fires when /plan mounts, so it sits
 * pending and the user watches it start on the next screen.
 */
type TraceState = {
  parseDone: boolean;
  requirements: number | null;
  resumeLines: number | null;
  dropped: number | null;
  diffStarted: boolean;
  gaps: number | null;
};

const EMPTY_TRACE: TraceState = {
  parseDone: false,
  requirements: null,
  resumeLines: null,
  dropped: null,
  diffStarted: false,
  gaps: null,
};

function toRows(t: TraceState): StageRow[] {
  return [
    {
      key: "jd",
      label: "parse jd",
      status: t.parseDone ? "done" : "running",
      detail: t.requirements === null ? undefined : `${t.requirements} requirement lines`,
    },
    {
      key: "resume",
      label: "parse resume",
      status: t.parseDone ? "done" : "running",
      detail: t.resumeLines === null ? undefined : `${t.resumeLines} evidence lines`,
    },
    {
      key: "diff",
      label:
        t.gaps === null && t.diffStarted && t.requirements !== null
          ? `diff gaps — adjudicating ${t.requirements} requirements`
          : "diff gaps",
      status: t.gaps !== null ? "done" : t.diffStarted ? "running" : "pending",
      detail: t.gaps === null ? undefined : `${t.gaps} gaps`,
    },
    {
      key: "plan",
      label: "compile session plan",
      status: "pending",
      detail: t.gaps === null ? undefined : "next",
    },
  ];
}

export default function CompileScreen() {
  const router = useRouter();
  const dispatch = useSessionDispatch();

  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [trace, setTrace] = useState<TraceState>(EMPTY_TRACE);
  const [error, setError] = useState<string | null>(null);

  const [resumeMode, setResumeMode] = useState<"type" | "upload">("type");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeFileError, setResumeFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeFile = (file: File | undefined) => {
    if (!file) return;
    setResumeFileError(null);
    if (!/\.(txt|md)$/i.test(file.name)) {
      setResumeFileError(
        "Only .txt or .md files are supported right now — paste the text instead for other formats.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setResume(String(reader.result ?? ""));
      setResumeFileName(file.name);
    };
    reader.onerror = () => setResumeFileError("Couldn't read that file — try pasting the text instead.");
    reader.readAsText(file);
  };

  async function compile() {
    setError(null);
    setTrace(EMPTY_TRACE);
    setStartedAt(Date.now());
    setRunning(true);

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ jd, resume }),
      });

      // Validation failures come back as plain JSON before the stream opens.
      if (!res.ok) {
        const message = await res
          .json()
          .then((b) => (typeof b?.error === "string" ? b.error : null))
          .catch(() => null);
        throw new Error(message ?? `The compile service returned ${res.status}.`);
      }

      let result: CompileResult | null = null;
      let streamError: string | null = null;

      await readSSE(res, {
        stage: (data: { stage: string; done?: boolean; requirements?: number; resumeLines?: number; dropped?: number; gaps?: number }) => {
          setTrace((prev) => {
            if (data.stage === "parsing") {
              return data.done
                ? {
                    ...prev,
                    parseDone: true,
                    requirements: data.requirements ?? null,
                    resumeLines: data.resumeLines ?? null,
                    dropped: data.dropped ?? null,
                  }
                : prev;
            }
            if (data.stage === "diffing") {
              return data.done
                ? { ...prev, diffStarted: true, gaps: data.gaps ?? null }
                : { ...prev, diffStarted: true };
            }
            return prev;
          });
        },
        result: (data: CompileResult) => {
          result = data;
        },
        // The 200 and the headers are already on the wire by the time a stage
        // throws, so failures arrive as a final event rather than an HTTP error.
        error: (data: { message?: string }) => {
          streamError = data?.message ?? "The compile failed partway through.";
        },
      });

      if (streamError) throw new Error(streamError);
      // A stream that ends without a result is a failure, never a success —
      // see the contract note in lib/stream.ts.
      if (!result) throw new Error("The compile stream ended before it produced any gaps.");

      dispatch({ type: "compile/set", compile: result });
      router.push("/plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRunning(false);
    }
  }

  // Both documents are required — the diff is between them, so one alone
  // compiles nothing. (The old gate used ||, which let a half-filled form
  // through to a guaranteed 400.)
  const canRun = jd.trim().length > 0 && resume.trim().length > 0;

  return (
    <main className="app-main">
      <div className={styles.content}>
        <p className="kicker">Step 1 of 4 · Compile</p>
        <h1 className={`display-2 ${styles.heading}`}>
          Start from the job you&apos;re actually interviewing for.
        </h1>
        <p className={`lead ${styles.subtext}`}>
          Paste the job description and your resume. DryRun diffs them into evidenced gaps — every
          gap citing the JD line that demands it and the resume line that&apos;s silent.
        </p>

        <div className={styles.grid}>
          <div>
            <div className={styles.inputHeader}>
              <label className={styles.inputLabel} htmlFor="jd-input">
                Job description
              </label>
            </div>
            <textarea
              id="jd-input"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here…"
              className="textarea"
              disabled={running}
            />
          </div>

          <div>
            <div className={styles.inputHeader}>
              <label className={styles.inputLabel} htmlFor="resume-input">
                Your resume
              </label>
              <div className={styles.modeToggle}>
                {(["type", "upload"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setResumeMode(mode)}
                    disabled={running}
                    className={`${styles.modeButton} ${resumeMode === mode ? styles.modeButtonActive : ""}`}
                  >
                    {mode === "type" ? "Paste" : "Upload"}
                  </button>
                ))}
              </div>
            </div>

            {resumeMode === "type" ? (
              <textarea
                id="resume-input"
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste your resume text here…"
                className="textarea"
                disabled={running}
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleResumeFile(e.dataTransfer.files?.[0]);
                }}
                className={styles.uploadZone}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,text/plain"
                  onChange={(e) => handleResumeFile(e.target.files?.[0])}
                  className={styles.uploadInput}
                />
                <div className={styles.uploadTitle}>
                  {resumeFileName ? `✓ ${resumeFileName}` : "Drop a .txt or .md file, or click to browse"}
                </div>
                <div className={styles.uploadSubtitle}>
                  {resumeFileName ? "Click to replace" : "Plain-text resumes only for now"}
                </div>
                {resumeFileError && <div className={styles.uploadError}>{resumeFileError}</div>}
              </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={compile}
            disabled={!canRun || running}
            className="btn btn-primary btn-lg btn-shadow"
          >
            {running ? "Compiling…" : "Compile my interview →"}
          </button>

          <button
            onClick={() => {
              setJd(SAMPLE_JD);
              setResume(SAMPLE_RESUME);
            }}
            disabled={running}
            className="btn-link"
          >
            ↺ Fill with a sample JD + resume
          </button>
        </div>

        {!canRun && !running && (
          <p className={styles.gateHint}>
            Both documents are needed — the gaps are the difference between them.
          </p>
        )}

        {startedAt !== null && !error && (
          <div className={styles.traceWrap}>
            <StageTrace
              stages={toRows(trace)}
              startedAt={startedAt}
              running={running}
              note={
                trace.dropped
                  ? `${trace.dropped} quoted line${trace.dropped === 1 ? "" : "s"} could not be anchored back to the source document and ${trace.dropped === 1 ? "was" : "were"} dropped rather than shown.`
                  : undefined
              }
            />
          </div>
        )}

        {error && (
          <div className={styles.errorBox} role="alert">
            <p className={styles.errorTitle}>The compile didn&apos;t finish.</p>
            <p className={styles.errorMessage}>{error}</p>
            <button onClick={compile} disabled={!canRun} className="btn btn-outline btn-sm">
              Try again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

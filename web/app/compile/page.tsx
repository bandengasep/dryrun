"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompileResult } from "@dryrun/core";
import { readSSE } from "../lib/stream";
import { useSessionDispatch } from "../lib/session-state";
import { extractFromFile, IngestError, type Extracted } from "../lib/extract";
import { ensureMockFlagFromUrl, mockCompile, mockEnabled, MockBanner } from "../lib/mock";
import StageTrace, { type StageRow } from "../components/StageTrace";
import styles from "./compile.module.css";

const SAMPLE_JD = `Senior Backend Engineer — Platform Team
Design scalable distributed systems and REST APIs serving production traffic.
Strong Python and SQL required for data-heavy services.
Experience with system design and algorithms at scale.
Deploy and operate services on AWS with Docker.
5+ years of professional backend experience.`;
const SAMPLE_RESUME = `Software engineer with 3 years building Python services and REST APIs.
Shipped containerized services with Docker in a small platform team.
Comfortable with SQL for reporting queries and joins.
Built graph and tree algorithms for a university research project.`;

/** Every format the extraction seam understands — both the file-picker's
 *  `accept` attribute and drag-and-drop (which the accept attribute cannot
 *  gate) rely on this list, with modeForFile as the real gatekeeper. */
const ACCEPT = ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

/** Where an extraction came from, in the words shown under the textarea. No
 *  total page count is available for a truncated PDF — extractFromFile only
 *  reports pages actually read — so the honest phrasing names what we know
 *  rather than inventing a total. */
function provenanceLine(extracted: Extracted): string {
  let originLabel: string;
  switch (extracted.origin) {
    case "pdf": {
      originLabel = "from PDF";
      if (extracted.pages !== null) {
        originLabel += ` · read ${extracted.pages} page${extracted.pages === 1 ? "" : "s"}`;
      }
      if (extracted.truncated) {
        originLabel += " — the rest was skipped";
      }
      break;
    }
    case "docx":
      originLabel = "from DOCX";
      break;
    case "image":
      originLabel = "transcribed from a screenshot";
      break;
    case "text-file": {
      const dot = extracted.fileName.lastIndexOf(".");
      const ext = dot === -1 ? "file" : extracted.fileName.slice(dot + 1).toUpperCase();
      originLabel = `from ${ext}`;
      break;
    }
  }
  return `${extracted.fileName} · ${originLabel}`;
}

type Provenance = {
  fileName: string;
  line: string;
  /** Shown only for vision-transcribed screenshots — lossier than a text
   *  layer, so it earns a stronger warning than the other origins. */
  warn: string | null;
};

/**
 * One document column: a Paste/Upload toggle over a shared textarea, used
 * identically for the JD and the resume. Upload accepts PDF, DOCX, TXT, MD,
 * or a screenshot; whatever comes back from extractFromFile is a DRAFT — it
 * lands in the editable textarea and the mode flips back to Paste, never
 * auto-compiling. A provenance strip names where the text came from until the
 * user edits it, at which point it describes text that no longer exists and
 * is cleared.
 */
function DocumentInput({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
}) {
  const [mode, setMode] = useState<"type" | "upload">("type");
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<Provenance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // What the textarea held right after the last successful extraction. As
  // long as `value` still matches this, the provenance strip is still
  // describing the text on screen; the moment it drifts — one keystroke, or
  // the "fill with a sample" button — the strip is describing text the user
  // has already changed, so it's cleared.
  const extractionBaselineRef = useRef<string | null>(null);

  useEffect(() => {
    if (extractionBaselineRef.current !== null && value !== extractionBaselineRef.current) {
      extractionBaselineRef.current = null;
      setProvenance(null);
    }
  }, [value]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    setBusy(true);
    try {
      const extracted = await extractFromFile(file);
      extractionBaselineRef.current = extracted.text;
      setProvenance({
        fileName: extracted.fileName,
        line: provenanceLine(extracted),
        warn:
          extracted.origin === "image"
            ? "transcribed by a vision model — check it against the posting before compiling"
            : null,
      });
      onValueChange(extracted.text);
      setMode("type");
    } catch (e) {
      setFileError(
        e instanceof IngestError || e instanceof Error
          ? e.message
          : "Couldn't read that file — try pasting the text instead.",
      );
    } finally {
      setBusy(false);
      // Let the same file be re-picked after an error without a reload.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className={styles.inputHeader}>
        <label className={styles.inputLabel} htmlFor={id}>
          {label}
        </label>
        <div className={styles.modeToggle}>
          {(["type", "upload"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={disabled}
              className={`${styles.modeButton} ${mode === m ? styles.modeButtonActive : ""}`}
            >
              {m === "type" ? "Paste" : "Upload"}
            </button>
          ))}
        </div>
      </div>

      {mode === "type" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          className="textarea"
          disabled={disabled}
        />
      ) : (
        <div
          onClick={() => !busy && !disabled && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy && !disabled) void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={styles.uploadZone}
          aria-busy={busy}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={(e) => void handleFile(e.target.files?.[0])}
            className={styles.uploadInput}
            disabled={disabled || busy}
          />
          <div className={styles.uploadTitle}>
            {busy
              ? "Reading…"
              : provenance
                ? `✓ ${provenance.fileName}`
                : "Drop a PDF, DOCX, TXT, MD, or screenshot, or click to browse"}
          </div>
          <div className={styles.uploadSubtitle}>
            {busy
              ? "This can take a few seconds"
              : provenance
                ? "Click to replace"
                : "PDF, DOCX, TXT, MD, PNG, JPG, or WEBP"}
          </div>
          {fileError && <div className={styles.uploadError}>{fileError}</div>}
        </div>
      )}

      {provenance && (
        <div className={styles.provenance}>
          <span>{provenance.line}</span>
          {provenance.warn && <div className={styles.provenanceWarn}>{provenance.warn}</div>}
        </div>
      )}
    </div>
  );
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

  // Read after mount only — the server has no sessionStorage, so reading the
  // flag during the first client render would disagree with the server's
  // always-false render and trip a hydration mismatch.
  const [mock, setMock] = useState(false);
  useEffect(() => {
    ensureMockFlagFromUrl();
    setMock(mockEnabled());
  }, []);

  // A compile the user walked away from must not come back to life. Its
  // `compile/set` is deliberately destructive (it clears plan + transcript +
  // debrief, so no receipt can outlive the documents it cites), and its
  // router.push would yank someone out of whatever they moved on to — a
  // rehearsal they are mid-answer in, restored from sessionStorage. Both
  // survive unmount on their own, so the request is aborted and the result is
  // discarded unless this screen is still the one on the page.
  const liveRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  async function compile() {
    setError(null);
    setTrace(EMPTY_TRACE);
    setStartedAt(Date.now());
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ jd, resume }),
        signal: controller.signal,
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

      if (!liveRef.current) return;
      dispatch({ type: "compile/set", compile: result });
      router.push("/plan");
    } catch (e) {
      // An abort is this screen unmounting, not a failure to report.
      if (!liveRef.current || (e instanceof DOMException && e.name === "AbortError")) return;
      setError(e instanceof Error ? e.message : String(e));
      setRunning(false);
    }
  }

  /**
   * The offline-mock path. Steps the same StageTrace the real /api/compile
   * SSE stream drives, just fed from mockCompile's synchronous output instead
   * of real events — 300ms apart so the trace reads as a pipeline rather than
   * a flash. No fetch, no network, matching the banner's claim.
   */
  async function compileMock() {
    setError(null);
    setTrace(EMPTY_TRACE);
    setStartedAt(Date.now());
    setRunning(true);

    try {
      const result = mockCompile(jd, resume);

      await sleep(300);
      setTrace((prev) => ({
        ...prev,
        parseDone: true,
        requirements: result.jd.lines.length,
        resumeLines: result.resume.lines.length,
        dropped: result.jd.dropped.length + result.resume.dropped.length,
      }));

      await sleep(300);
      setTrace((prev) => ({ ...prev, diffStarted: true }));

      await sleep(300);
      setTrace((prev) => ({ ...prev, gaps: result.gaps.length }));

      if (!liveRef.current) return;
      dispatch({ type: "compile/set", compile: result });
      router.push("/plan");
    } catch (e) {
      if (!liveRef.current) return;
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
        {mock && <MockBanner />}

        <p className="kicker">Step 1 of 4 · Compile</p>
        <h1 className={`display-2 ${styles.heading}`}>
          Start from the job you&apos;re actually interviewing for.
        </h1>
        <p className={`lead ${styles.subtext}`}>
          Paste the job description and your resume. DryRun diffs them into evidenced gaps — every
          gap citing the JD line that demands it and the resume line that&apos;s silent.
        </p>

        <div className={styles.grid}>
          <DocumentInput
            id="jd-input"
            label="Job description"
            value={jd}
            onValueChange={setJd}
            placeholder="Paste the job description here…"
            disabled={running}
          />
          <DocumentInput
            id="resume-input"
            label="Your resume"
            value={resume}
            onValueChange={setResume}
            placeholder="Paste your resume text here…"
            disabled={running}
          />
        </div>

        <div className={styles.actions}>
          <button
            onClick={() => void (mock ? compileMock() : compile())}
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
                mock
                  ? "Offline demo mode — these numbers come from keyword overlap, not a model."
                  : trace.dropped
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
            <button
              onClick={() => void (mock ? compileMock() : compile())}
              disabled={!canRun}
              className="btn btn-outline btn-sm"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

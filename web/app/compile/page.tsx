"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Gap } from "@dryrun/core";
import styles from "./compile.module.css";
import logoImg from "../assets/logo-img.png";

const SAMPLE_JD =
  "Senior Backend Engineer. You will design scalable distributed systems and REST APIs. " +
  "Strong Python and SQL required. Experience with system design, algorithms, AWS and Docker. 5+ years.";
const SAMPLE_RESUME =
  "Software engineer with 3 years building Python services and REST APIs. " +
  "Comfortable with Docker and some SQL. Built graph and tree algorithms at university.";

export default function CompileScreen() {
  const router = useRouter();
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<"login" | "signup" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [resumeMode, setResumeMode] = useState<"type" | "upload">("type");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeFileError, setResumeFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeFile = (file: File | undefined) => {
    if (!file) return;
    setResumeFileError(null);
    if (!/\.(txt|md)$/i.test(file.name)) {
      setResumeFileError("Only .txt or .md files are supported right now — paste the text instead for other formats.");
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
    setLoading(true);
    setGaps(null);
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd, resume }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setGaps(data.gaps);
      setTimeout(() => router.push("/results"), 500);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const handleAuthSubmit = () => {
    setShowAuthModal(null);
    setAuthEmail("");
    setAuthPassword("");
  };

  const canRun = jd.trim().length > 0 || resume.trim().length > 0;

  return (
    <main className="app-main">
      {/* Header */}
      <header className="site-header">
        {/* Logo */}
        <button className="logo" onClick={() => router.push("/")}>
          <img src={logoImg.src} alt="Dry Run logo" className="logo-img" />
          <span className="logo-text">Dry Run</span>
        </button>

        {/* Nav tabs */}
        <div className="nav-tabs">
          {[
            { label: "Home", path: "/" },
            { label: "About", path: "/about" },
            { label: "Interview Compiler", path: "/compile" },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.path)}
              className={`nav-tab ${tab.label === "Interview Compiler" ? "nav-tab-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="auth-buttons">
          <button onClick={() => setShowAuthModal("login")} className="btn btn-outline btn-sm">
            Login
          </button>
          <button onClick={() => setShowAuthModal("signup")} className="btn btn-primary btn-sm">
            Sign up
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className={styles.content}>
        {/* Heading & subtext */}
        <h1 className={styles.heading}>Turn a job description into targeted interview practice.</h1>
        <p className={styles.subtext}>
          Paste a JD and your resume. Dry Run diffs them into evidenced gaps — every gap citing the JD line that
          demands it and the resume line that&apos;s silent.
        </p>

        <div className={styles.grid}>
          {/* JD input */}
          <div>
            <div className={styles.inputHeader}>
              <label className={styles.inputLabel}>Job description</label>
              <span className={styles.stepLabel}>Step 1</span>
            </div>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here…"
              className="textarea"
            />
          </div>

          {/* Resume input */}
          <div>
            <div className={styles.inputHeader}>
              <label className={styles.inputLabel}>Your resume</label>
              <span className={styles.stepLabel}>Step 2</span>
            </div>

            {/* Type / Upload toggle */}
            <div className={styles.modeToggle}>
              {(["type", "upload"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setResumeMode(mode)}
                  className={`${styles.modeButton} ${resumeMode === mode ? styles.modeButtonActive : ""}`}
                >
                  {mode === "type" ? "Type" : "Upload"}
                </button>
              ))}
            </div>

            {resumeMode === "type" ? (
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste your resume text here…"
                className="textarea"
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
                  {resumeFileName ? "Click to replace" : "Plain text resumes only for now"}
                </div>
                {resumeFileError && <div className={styles.uploadError}>{resumeFileError}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Sample button */}
        <button
          onClick={() => {
            setJd(SAMPLE_JD);
            setResume(SAMPLE_RESUME);
          }}
          className={styles.sampleLink}
        >
          ↺ Fill with a sample JD + resume
        </button>

        {/* Compile CTA */}
        <button
          onClick={compile}
          disabled={!canRun || loading}
          className={`btn btn-primary btn-lg btn-block btn-shadow ${styles.ctaButton}`}
        >
          {loading ? "Compiling…" : "Compile my interview  →"}
        </button>
        <p className={styles.ctaHint}>Runs entirely on-device. No account, no upload.</p>

        {/* Error message */}
        {error && <div className={styles.errorBox}>Error: {error}</div>}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{showAuthModal === "login" ? "Login" : "Sign up"}</h2>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
              />
            </div>

            <div className="form-group form-group-last">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
              />
            </div>

            <div className="modal-actions">
              <button onClick={handleAuthSubmit} className="btn btn-primary btn-block btn-modal">
                {showAuthModal === "login" ? "Login" : "Sign up"}
              </button>

              <button onClick={() => setShowAuthModal(null)} className="btn btn-outline btn-block btn-modal">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

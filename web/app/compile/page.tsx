"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Gap } from "@dryrun/core";

const colors = {
  bg: "#0A0F1C",
  surface: "#0F1728",
  surface2: "#131E33",
  elevated: "#1A2740",
  border: "#243350",
  borderStrong: "#33456A",
  text: "#EAF1FC",
  text2: "#A9B7D0",
  muted: "#6C7C9C",
  cyan: "#22D3EE",
  blue: "#3B82F6",
  deep: "#1E40AF",
  onAccent: "#04121F",
  green: "#34D399",
  amber: "#FBBF24",
  red: "#F87171",
  purple: "#A78BFA",
};

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
    <main
      style={{
        backgroundColor: colors.bg,
        minHeight: "100vh",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: "rgba(10, 15, 28, 0.8)",
          backdropFilter: "blur(10px)",
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
          onClick={() => router.push("/")}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: colors.cyan,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: colors.onAccent, fontWeight: 800, fontSize: 14 }}>{"</>"}</span>
          </div>
          <span style={{ color: colors.text, fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
            Dry Run
          </span>
        </div>

        {/* Nav tabs */}
        <div
          style={{
            display: "flex",
            gap: 32,
            flex: 1,
            justifyContent: "center",
          }}
        >
          {[
            { label: "Home", path: "/" },
            { label: "About", path: "/about" },
            { label: "Interview Compiler", path: "/compile" },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.path)}
              style={{
                background: "none",
                border: "none",
                color: tab.label === "Interview Compiler" ? colors.cyan : colors.text2,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                transition: "color 200ms",
                borderBottomColor: tab.label === "Interview Compiler" ? colors.cyan : "transparent",
                borderBottomWidth: tab.label === "Interview Compiler" ? 2 : 0,
                paddingBottom: 2,
              }}
              onMouseEnter={(e) => tab.label !== "Interview Compiler" && (e.currentTarget.style.color = colors.cyan)}
              onMouseLeave={(e) => tab.label !== "Interview Compiler" && (e.currentTarget.style.color = colors.text2)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Auth buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={() => setShowAuthModal("login")}
            style={{
              background: "none",
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "8px 16px",
              color: colors.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 200ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface2;
              e.currentTarget.style.borderColor = colors.cyan;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderColor = colors.border;
            }}
          >
            Login
          </button>
          <button
            onClick={() => setShowAuthModal("signup")}
            style={{
              backgroundColor: colors.cyan,
              borderRadius: 8,
              padding: "8px 16px",
              border: "none",
              color: colors.onAccent,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 200ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Sign up
          </button>
        </div>
      </header>

      {/* Main content */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 20,
          paddingBottom: 48,
          flex: 1,
        }}
      >
        {/* Heading & subtext */}
        <h1
          style={{
            color: colors.text,
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: -0.6,
            lineHeight: 1.22,
            marginBottom: 12,
          }}
        >
          Turn a job description into targeted interview practice.
        </h1>
        <p
          style={{
            color: colors.text2,
            fontSize: 15,
            lineHeight: 1.47,
            marginBottom: 28,
            maxWidth: 640,
          }}
        >
          Paste a JD and your resume. Dry Run diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that&apos;s silent.
        </p>

        {/* JD input */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <label style={{ color: colors.text, fontSize: 14, fontWeight: 700 }}>Job description</label>
            <span style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.4 }}>
              Step 1
            </span>
          </div>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here…"
            style={{
              minHeight: 120,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: 14,
              color: colors.text,
              fontSize: 14,
              lineHeight: 1.4,
              fontFamily: "inherit",
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
        </div>

        {/* Resume input */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <label style={{ color: colors.text, fontSize: 14, fontWeight: 700 }}>Your resume</label>
            <span style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.4 }}>
              Step 2
            </span>
          </div>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume text here…"
            style={{
              minHeight: 120,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: 14,
              color: colors.text,
              fontSize: 14,
              lineHeight: 1.4,
              fontFamily: "inherit",
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
        </div>

        {/* Sample button */}
        <button
          onClick={() => {
            setJd(SAMPLE_JD);
            setResume(SAMPLE_RESUME);
          }}
          style={{
            paddingTop: 8,
            paddingBottom: 8,
            marginBottom: 12,
            background: "none",
            border: "none",
            color: colors.cyan,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ↺ Fill with a sample JD + resume
        </button>

        {/* Compile CTA */}
        <button
          onClick={compile}
          disabled={!canRun || loading}
          style={{
            backgroundColor: canRun && !loading ? colors.cyan : colors.elevated,
            borderRadius: 14,
            paddingTop: 16,
            paddingBottom: 16,
            width: "100%",
            marginTop: 6,
            color: canRun && !loading ? colors.onAccent : colors.muted,
            fontSize: 16,
            fontWeight: 800,
            border: "none",
            cursor: canRun && !loading ? "pointer" : "not-allowed",
            transition: "opacity 200ms",
            boxShadow: canRun && !loading ? `0 6px 18px rgba(34,211,238,0.35)` : "none",
          }}
        >
          {loading ? "Compiling…" : "Compile my interview  →"}
        </button>
        <p style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 12 }}>
          Runs entirely on-device. No account, no upload.
        </p>

        {/* Error message */}
        {error && (
          <div
            style={{
              marginTop: 20,
              backgroundColor: `rgba(248, 113, 113, 0.1)`,
              borderColor: colors.red,
              border: `1px solid ${colors.red}`,
              borderRadius: 14,
              padding: 14,
              color: colors.red,
            }}
          >
            Error: {error}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAuthModal(null)}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 32,
              maxWidth: 400,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                color: colors.text,
                fontSize: 24,
                fontWeight: 800,
                marginBottom: 24,
              }}
            >
              {showAuthModal === "login" ? "Login" : "Sign up"}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  color: colors.text2,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.elevated,
                  color: colors.text,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  color: colors.text2,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.elevated,
                  color: colors.text,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={handleAuthSubmit}
              style={{
                backgroundColor: colors.cyan,
                borderRadius: 8,
                padding: "12px 16px",
                width: "100%",
                border: "none",
                color: colors.onAccent,
                fontSize: 16,
                fontWeight: 800,
                cursor: "pointer",
                marginBottom: 12,
                transition: "opacity 200ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {showAuthModal === "login" ? "Login" : "Sign up"}
            </button>

            <button
              onClick={() => setShowAuthModal(null)}
              style={{
                backgroundColor: "transparent",
                borderRadius: 8,
                padding: "12px 16px",
                width: "100%",
                border: `1px solid ${colors.border}`,
                color: colors.text2,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 200ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.elevated;
                e.currentTarget.style.borderColor = colors.cyan;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

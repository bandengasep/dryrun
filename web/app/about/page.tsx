"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

export default function About() {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState<"login" | "signup" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const handleAuthSubmit = () => {
    setShowAuthModal(null);
    setAuthEmail("");
    setAuthPassword("");
  };

  return (
    <main
      style={{
        backgroundColor: colors.bg,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                color: tab.label === "About" ? colors.cyan : colors.text2,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                transition: "color 200ms",
                borderBottomColor: tab.label === "About" ? colors.cyan : "transparent",
                borderBottomWidth: tab.label === "About" ? 2 : 0,
                paddingBottom: 2,
              }}
              onMouseEnter={(e) => tab.label !== "About" && (e.currentTarget.style.color = colors.cyan)}
              onMouseLeave={(e) => tab.label !== "About" && (e.currentTarget.style.color = colors.text2)}
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

      {/* Content */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "48px 24px",
          flex: 1,
        }}
      >
        <h1
          style={{
            color: colors.text,
            fontSize: 40,
            fontWeight: 800,
            marginBottom: 24,
            letterSpacing: -0.5,
          }}
        >
          About Dry Run
        </h1>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <section>
            <h2
              style={{
                color: colors.cyan,
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              The Problem
            </h2>
            <p
              style={{
                color: colors.text2,
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              Every job interview starts the same way: you hunt through generic question banks and try to guess what the interviewer will ask. You don't know your real gaps — where the job demands something you're weak on. So you prep everything, waste weeks, and still walk into the room unprepared.
            </p>
          </section>

          <section>
            <h2
              style={{
                color: colors.cyan,
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Our Solution
            </h2>
            <p
              style={{
                color: colors.text2,
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              Paste a job description and your resume. Dry Run diffs them into evidenced gaps — every gap cites the exact line from the JD that demands it and the exact line (or silence) from your resume that speaks to it. Then we compile personalized coding, SQL, and system design challenges directly from those gaps.
            </p>
          </section>

          <section>
            <h2
              style={{
                color: colors.cyan,
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              How It Works
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {[
                { num: "1", title: "Paste", desc: "Upload a JD and your resume" },
                { num: "2", title: "Diff", desc: "We extract gaps with receipts" },
                { num: "3", title: "Compile", desc: "Generate personalized challenges" },
                { num: "4", title: "Practice", desc: "Run code, sharpen your skills" },
              ].map((step) => (
                <div
                  key={step.num}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 50,
                      backgroundColor: colors.cyan,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: colors.onAccent,
                      fontWeight: 800,
                      marginBottom: 8,
                    }}
                  >
                    {step.num}
                  </div>
                  <h3
                    style={{
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      color: colors.muted,
                      fontSize: 13,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2
              style={{
                color: colors.cyan,
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Key Features
            </h2>
            <ul
              style={{
                color: colors.text2,
                fontSize: 15,
                lineHeight: 1.8,
                listStyle: "none",
                padding: 0,
              }}
            >
              {[
                "On-device processing — no uploads, no account needed",
                "Evidence-based gaps — every claim is traceable to the source",
                "Executable challenges — all SQL and code runs in a sandbox",
                "Real-time feedback — see what works, what doesn't",
                "Targeted practice — focus only on what matters for your target role",
              ].map((feature) => (
                <li
                  key={feature}
                  style={{
                    marginBottom: 12,
                  }}
                >
                  <span style={{ color: colors.cyan, marginRight: 8 }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        </div>
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

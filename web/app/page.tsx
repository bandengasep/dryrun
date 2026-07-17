"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";

const CODE_FONT =
  '"Google Sans Code", "SF Mono", Menlo, Monaco, "Fira Code", Consolas, "Courier New", monospace';
const BRAND_TEXT = "Dry Run";
const BRAND_TAG = `<${BRAND_TEXT}>`;

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

function CodeTag({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} style={{ color: ch === "<" || ch === ">" ? colors.cyan : "inherit" }}>
          {ch}
        </span>
      ))}
    </>
  );
}

export default function Landing() {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState<"login" | "signup" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [vantaLoaded, setVantaLoaded] = useState(false);
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!threeLoaded || !vantaLoaded || !vantaRef.current || vantaEffect.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const w = window as unknown as { VANTA: { NET: (opts: Record<string, unknown>) => { destroy: () => void } } };

    vantaEffect.current = w.VANTA.NET({
      el: vantaRef.current,
      mouseControls: !prefersReducedMotion,
      touchControls: !prefersReducedMotion,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0x22d3ee, // colors.cyan
      backgroundColor: 0x0a0f1c, // colors.bg
      points: prefersReducedMotion ? 4.0 : 9.0,
      maxDistance: prefersReducedMotion ? 0 : 20.0,
      spacing: 18.0,
      showDots: true,
    });

    return () => {
      vantaEffect.current?.destroy();
      vantaEffect.current = null;
    };
  }, [threeLoaded, vantaLoaded]);

  const [typedBrand, setTypedBrand] = useState("");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setTypedBrand(BRAND_TAG);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTypedBrand(BRAND_TAG.slice(0, i));
      if (i >= BRAND_TAG.length) clearInterval(interval);
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const handleAuthSubmit = () => {
    // Placeholder auth logic
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
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background */}
      <Script
        src="https://unpkg.com/three@0.134.0/build/three.min.js"
        strategy="afterInteractive"
        onLoad={() => setThreeLoaded(true)}
      />
      {threeLoaded && (
        // Vanta's UMD bundle reads window.THREE at parse time, so it must not
        // even start loading until three.min.js has set that global.
        <Script
          src="https://unpkg.com/vanta@0.5.24/dist/vanta.net.min.js"
          strategy="afterInteractive"
          onLoad={() => setVantaLoaded(true)}
        />
      )}
      <style>{`
        .animated-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
        }
        @keyframes blink-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .type-cursor {
          display: inline-block;
          margin-left: 2px;
          animation: blink-cursor 1s step-end infinite;
        }
      `}</style>

      <div ref={vantaRef} className="animated-bg" />

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
          <span
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: -0.5,
              fontFamily: CODE_FONT,
            }}
          >
            <CodeTag text={BRAND_TAG} />
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
                color: colors.text2,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                transition: "color 200ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.cyan)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.text2)}
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
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          position: "relative",
          zIndex: 5,
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            textAlign: "center",
          }}
        >
          {/* Brand logo */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              backgroundColor: colors.cyan,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <span style={{ color: colors.onAccent, fontWeight: 800, fontSize: 24 }}>{"</>"}</span>
          </div>

          {/* Brand text */}
          <h1
            style={{
              color: colors.text,
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: -1,
              marginBottom: 12,
              lineHeight: 1.2,
              fontFamily: CODE_FONT,
            }}
          >
            <CodeTag text={typedBrand} />
            <span className="type-cursor" style={{ color: colors.cyan }}>
              ▌
            </span>
          </h1>

          {/* Subheading */}
          <p
            style={{
              color: colors.text2,
              fontSize: 18,
              lineHeight: 1.5,
              marginBottom: 32,
              fontWeight: 500,
            }}
          >
            Turn a job description into targeted interview practice.
          </p>

          {/* Description */}
          <p
            style={{
              color: colors.muted,
              fontSize: 15,
              lineHeight: 1.6,
              marginBottom: 40,
              maxWidth: 480,
              margin: "0 auto 40px",
            }}
          >
            Paste a JD and your resume. Dry Run diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then generates personalized coding and system design challenges.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <button
              onClick={() => router.push("/compile")}
              style={{
                backgroundColor: colors.cyan,
                borderRadius: 14,
                paddingTop: 16,
                paddingBottom: 16,
                paddingLeft: 24,
                paddingRight: 24,
                width: "100%",
                fontSize: 16,
                fontWeight: 800,
                color: colors.onAccent,
                border: "none",
                cursor: "pointer",
                transition: "opacity 200ms",
                boxShadow: `0 6px 18px rgba(34,211,238,0.35)`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Start an interview →
            </button>

            <button
              onClick={() => window.open("https://youtu.be/demo", "_blank")}
              style={{
                backgroundColor: colors.surface2,
                borderColor: colors.border,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                paddingTop: 16,
                paddingBottom: 16,
                paddingLeft: 24,
                paddingRight: 24,
                width: "100%",
                fontSize: 16,
                fontWeight: 800,
                color: colors.text,
                cursor: "pointer",
                transition: "opacity 200ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Watch demo
            </button>
          </div>

          {/* Footer note */}
          <p style={{ color: colors.muted, fontSize: 12 }}>
            Runs entirely on-device. No account, no upload.
          </p>
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

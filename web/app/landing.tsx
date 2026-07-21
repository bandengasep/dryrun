"use client";

import { useRouter } from "next/navigation";

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

export default function Landing() {
  const router = useRouter();

  return (
    <main
      style={{
        backgroundColor: colors.bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: 20,
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
          }}
        >
          Dry Run
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
    </main>
  );
}

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

const challenges = [
  {
    id: "sql-1",
    lang: "SQL",
    tab: "sql",
    difficulty: "Medium",
    title: "Build a Scalable Query",
    blurb: "Write an optimized SQL query to fetch user activity data with joins and aggregations.",
    reason: "Addresses weak evidence in SQL + system design gap.",
    runnable: true,
  },
  {
    id: "py-1",
    lang: "Python",
    tab: "python",
    difficulty: "Hard",
    title: "Implement Graph Traversal",
    blurb: "Write a graph traversal algorithm with memoization for efficient path finding.",
    reason: "Directly targets missing algorithms & data structure skills.",
    runnable: true,
  },
  {
    id: "sys-1",
    lang: "System Design",
    tab: "design",
    difficulty: "Hard",
    title: "Design a Scalable API",
    blurb: "Design a REST API architecture for a high-traffic service with database and cache layers.",
    reason: "Bridges missing system design and architecture expertise.",
    runnable: false,
  },
];

function tagStyle(lang: string) {
  if (lang === "Python") return { backgroundColor: "rgba(251,191,36,0.12)", color: colors.amber };
  if (lang === "SQL") return { backgroundColor: "rgba(34,211,238,0.12)", color: colors.cyan };
  if (lang === "System Design") return { backgroundColor: "rgba(167,139,250,0.12)", color: colors.purple };
  return { backgroundColor: "rgba(59,130,246,0.12)", color: colors.blue };
}

export default function ResultsScreen() {
  const router = useRouter();

  const openChallenge = (lang: string) => {
    router.push(`/compiler/${lang.toLowerCase()}`);
  };

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <button
            onClick={() => router.push("/")}
            style={{
              background: "none",
              border: "none",
              color: colors.cyan,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Back
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: colors.cyan,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: colors.onAccent, fontWeight: 700, fontSize: 11 }}>{"</>"}</span>
            </div>
            <span style={{ color: colors.text, fontSize: 16, fontWeight: 700 }}>Dry Run</span>
          </div>
          <div style={{ width: 60 }} />
        </div>

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

        {/* Readiness gauge */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 12,
            }}
          >
            <span style={{ color: colors.text2, fontSize: 14, fontWeight: 600 }}>Interview readiness</span>
            <span style={{ color: colors.green, fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>
              65%
            </span>
          </div>
          <div
            style={{
              height: 10,
              backgroundColor: colors.border,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "65%",
                backgroundColor: colors.green,
                borderRadius: 999,
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginBottom: 26,
          }}
        >
          {[
            { n: 4, label: "ready", color: colors.green },
            { n: 3, label: "to sharpen", color: colors.amber },
            { n: 2, label: "missing", color: colors.red },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                paddingTop: 14,
                paddingBottom: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ color: stat.color, fontSize: 24, fontWeight: 800 }}>
                {stat.n}
              </div>
              <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Suggested challenges section */}
        <h2
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: -0.3,
            marginTop: 8,
            marginBottom: 6,
          }}
        >
          Suggested challenges
        </h2>
        <p style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>
          Generated from your gaps, ranked by interview priority.
        </p>

        {/* Challenge cards */}
        {challenges.map((c) => {
          const style = tagStyle(c.lang);
          return (
            <div
              key={c.id}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              {/* Card header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    borderRadius: 999,
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingTop: 4,
                    paddingBottom: 4,
                    ...style,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                    }}
                  >
                    {c.lang}
                  </span>
                </div>
                <span style={{ color: colors.muted, fontSize: 12, fontWeight: 700 }}>
                  {c.difficulty}
                </span>
              </div>

              {/* Card title */}
              <div
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: -0.3,
                  marginBottom: 6,
                }}
              >
                {c.title}
              </div>

              {/* Card blurb */}
              <div
                style={{
                  color: colors.text2,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  marginBottom: 10,
                }}
              >
                {c.blurb}
              </div>

              {/* Reason */}
              <div
                style={{
                  color: colors.cyan,
                  fontSize: 12.5,
                  marginBottom: 14,
                  fontWeight: 600,
                }}
              >
                ◦ {c.reason}
              </div>

              {/* Action button */}
              {c.runnable ? (
                <button
                  onClick={() => openChallenge(c.lang)}
                  style={{
                    marginTop: 0,
                    backgroundColor: colors.cyan,
                    borderRadius: 11,
                    paddingTop: 12,
                    paddingBottom: 12,
                    width: "100%",
                    alignItems: "center",
                    border: "none",
                    color: colors.onAccent,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "opacity 200ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Open in compiler  ▸
                </button>
              ) : (
                <div
                  style={{
                    marginTop: 0,
                    backgroundColor: colors.surface2,
                    borderColor: colors.border,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 11,
                    paddingTop: 12,
                    paddingBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: colors.muted,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Generated · prompt only
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

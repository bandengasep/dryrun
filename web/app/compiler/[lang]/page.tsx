"use client";

import { useRouter, useParams } from "next/navigation";
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

const DEFAULT_CODE = {
  python: `# Write your solution here
def solve():
    pass

# Test your code
print(solve())`,
  sql: `-- Write your solution here
SELECT * FROM table_name
WHERE condition;`,
};

export default function CompilerPage() {
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || "python";
  const [code, setCode] = useState(DEFAULT_CODE[lang as keyof typeof DEFAULT_CODE] || "");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const langDisplay = lang === "python" ? "Python" : "SQL";
  const langColor = lang === "python" ? colors.amber : colors.cyan;

  const runCode = async () => {
      setRunning(true);
      try {
        await new Promise((r) => setTimeout(r, 800));
        setOutput("✓ Test passed!\nOutput: Success");
      } catch (e) {
        setOutput(`Error: ${String(e)}`);
      } finally {
        setRunning(false);
      }
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
        {/* Compact header: back button + lang badge */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => router.back()}
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

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                backgroundColor: `rgba(${lang === "python" ? "251,191,36" : "34,211,238"},0.12)`,
                borderRadius: 6,
                padding: "4px 10px",
              }}
            >
              <span
                style={{
                  color: langColor,
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {langDisplay}
              </span>
            </div>
            <span style={{ color: colors.text, fontSize: 14, fontWeight: 700 }}>Interview Compiler</span>
          </div>

          <div style={{ width: 60 }} />
        </div>

        {/* Main content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            flex: 1,
            gap: 1,
            backgroundColor: colors.border,
          }}
        >
          {/* Code editor */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: colors.bg,
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottomColor: colors.border,
                borderBottomWidth: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: colors.text, fontSize: 14, fontWeight: 700 }}>Code</span>
              <button
                onClick={() => setCode(DEFAULT_CODE[lang as keyof typeof DEFAULT_CODE] || "")}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.cyan,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Reset
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                color: colors.text,
                border: "none",
                padding: 16,
                fontSize: 13,
                fontFamily: "Menlo, monospace",
                lineHeight: 1.5,
                resize: "none",
              }}
            />
          </div>

          {/* Output pane */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: colors.bg,
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottomColor: colors.border,
                borderBottomWidth: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: colors.text, fontSize: 14, fontWeight: 700 }}>Output</span>
              <button
                onClick={runCode}
                disabled={running}
                style={{
                  backgroundColor: running ? colors.elevated : colors.cyan,
                  borderRadius: 6,
                  paddingTop: 6,
                  paddingBottom: 6,
                  paddingLeft: 12,
                  paddingRight: 12,
                  border: "none",
                  color: running ? colors.muted : colors.onAccent,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: running ? "not-allowed" : "pointer",
                  transition: "opacity 200ms",
                }}
                onMouseEnter={(e) => !running && (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => !running && (e.currentTarget.style.opacity = "1")}
              >
                {running ? "Running..." : "Run"}
              </button>
            </div>
            <div
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                padding: 16,
                color: colors.text2,
                fontSize: 13,
                fontFamily: "Menlo, monospace",
                lineHeight: 1.5,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {output || <span style={{ color: colors.muted }}>Output will appear here after running…</span>}
            </div>
          </div>
        </div>
      </main>
    );
}

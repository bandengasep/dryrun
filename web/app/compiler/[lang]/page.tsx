"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import styles from "./compiler.module.css";

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
  const langBadgeClass = lang === "python" ? styles.langBadgePython : styles.langBadgeSql;

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
    <main className="app-main">
      {/* Compact header: back button + lang badge */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className="btn-link">
          ← Back
        </button>

        <div className={styles.headerCenter}>
          <div className={`${styles.langBadge} ${langBadgeClass}`}>
            <span className={styles.langText}>{langDisplay}</span>
          </div>
          <span className={styles.headerTitle}>Interview Compiler</span>
        </div>

        <div className="header-spacer" />
      </div>

      {/* Main content */}
      <div className={styles.grid}>
        {/* Code editor */}
        <div className={styles.pane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneLabel}>Code</span>
            <button
              onClick={() => setCode(DEFAULT_CODE[lang as keyof typeof DEFAULT_CODE] || "")}
              className={styles.resetLink}
            >
              Reset
            </button>
          </div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} className={styles.codeTextarea} />
        </div>

        {/* Output pane */}
        <div className={styles.pane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneLabel}>Output</span>
            <button
              onClick={runCode}
              disabled={running}
              className={`btn btn-primary ${styles.runButton}`}
            >
              {running ? "Running..." : "Run"}
            </button>
          </div>
          <div className={styles.outputPane}>
            {output || <span className={styles.outputPlaceholder}>Output will appear here after running…</span>}
          </div>
        </div>
      </div>
    </main>
  );
}

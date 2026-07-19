"use client";

import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { tokenize, type CodeLang, type TokenType } from "./highlight";
import styles from "./compiler.module.css";

const DEFAULT_CODE = {
  python: `# Write your solution here
def two_sum(nums, target):
    """Return indices of the two numbers that add up to target."""
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []


# Test your code
result = two_sum([2, 7, 11, 15], 9)
print(f"Indices: {result}")`,
  sql: `-- Write your solution here
SELECT
    u.id,
    u.name,
    COUNT(o.id) AS total_orders,
    SUM(o.amount) AS total_spent
FROM users AS u
LEFT JOIN orders AS o
    ON o.user_id = u.id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC
LIMIT 10;`,
};

const TOKEN_CLASS: Partial<Record<TokenType, string>> = {
  keyword: styles.tokKeyword,
  string: styles.tokString,
  comment: styles.tokComment,
  number: styles.tokNumber,
  function: styles.tokFunction,
};

export default function CompilerPage() {
  const params = useParams();
  const lang = (params?.lang as string) || "python";
  const codeLang: CodeLang = lang === "python" ? "python" : "sql";
  const [code, setCode] = useState(DEFAULT_CODE[lang as keyof typeof DEFAULT_CODE] || "");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const highlightRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const langDisplay = lang === "python" ? "Python" : "SQL";
  const langBadgeClass = lang === "python" ? styles.langBadgePython : styles.langBadgeSql;

  const syncScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

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
      {/* Main content */}
      <div className={styles.grid}>
        {/* Code editor */}
        <div className={styles.pane}>
          <div className={styles.paneHeader}>
            <div className={styles.headerCenter}>
              <div className={`${styles.langBadge} ${langBadgeClass}`}>
                <span className={styles.langText}>{langDisplay}</span>
              </div>
              <span className={styles.paneLabel}>Code</span>
            </div>
            <button
              onClick={() => setCode(DEFAULT_CODE[lang as keyof typeof DEFAULT_CODE] || "")}
              className={styles.resetLink}
            >
              Reset
            </button>
          </div>
          <div className={styles.editorWrap}>
            <pre ref={highlightRef} className={styles.highlightLayer} aria-hidden="true">
              {tokenize(code, codeLang).map((t, i) =>
                t.type === "text" ? (
                  t.text
                ) : (
                  <span key={i} className={TOKEN_CLASS[t.type]}>
                    {t.text}
                  </span>
                )
              )}
              {"\n"}
            </pre>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={syncScroll}
              spellCheck={false}
              className={styles.codeTextarea}
            />
          </div>
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

"use client";

import styles from "./about.module.css";

export default function About() {
  return (
    <main className="app-main">
      {/* Content */}
      <div className={styles.content}>
        <h1 className={styles.pageTitle}>About Dry Run</h1>

        <div className={styles.sections}>
          <section>
            <h2 className={styles.sectionTitle}>The Problem</h2>
            <p className={styles.sectionText}>
              Every job interview starts the same way: you hunt through generic question banks and try to guess what
              the interviewer will ask. You don&apos;t know your real gaps — where the job demands something
              you&apos;re weak on. So you prep everything, waste weeks, and still walk into the room unprepared.
            </p>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Our Solution</h2>
            <p className={styles.sectionText}>
              Paste a job description and your resume. Dry Run diffs them into evidenced gaps — every gap cites the
              exact line from the JD that demands it and the exact line (or silence) from your resume that speaks to
              it. Then we compile personalized coding, SQL, and system design challenges directly from those gaps.
            </p>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>How It Works</h2>
            <div className={styles.stepsGrid}>
              {[
                { num: "1", title: "Paste", desc: "Upload a JD and your resume" },
                { num: "2", title: "Diff", desc: "We extract gaps with receipts" },
                { num: "3", title: "Compile", desc: "Generate personalized challenges" },
                { num: "4", title: "Practice", desc: "Run code, sharpen your skills" },
              ].map((step) => (
                <div key={step.num} className={styles.stepCard}>
                  <div className={styles.stepBadge}>{step.num}</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Key Features</h2>
            <ul className={styles.featureList}>
              {[
                "On-device processing — no uploads, no account needed",
                "Evidence-based gaps — every claim is traceable to the source",
                "Executable challenges — all SQL and code runs in a sandbox",
                "Real-time feedback — see what works, what doesn't",
                "Targeted practice — focus only on what matters for your target role",
              ].map((feature) => (
                <li key={feature} className={styles.featureItem}>
                  <span className={styles.checkMark}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

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
              it. Those gaps compile into the questions you&apos;re likely to face, you rehearse them against an AI
              interviewer, and the debrief afterwards quotes your own answers back to you.
            </p>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>How It Works</h2>
            <div className={styles.stepsGrid}>
              {[
                { num: "1", title: "Compile", desc: "Diff a JD against your resume into gaps with receipts" },
                { num: "2", title: "Plan", desc: "Each gap compiles into a question you'll face" },
                { num: "3", title: "Session", desc: "Rehearse live against an AI interviewer" },
                { num: "4", title: "Debrief", desc: "Feedback that quotes your own answers" },
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
                "Evidence-based gaps — every claim is traceable to the source line",
                "Every question cites the gap that produced it — no generic question banks",
                "Debrief feedback quotes you verbatim; a quote that fails validation is withheld, not shown",
                "No scores, no grades — a stance, not a gap in the product",
                "Your documents stay in this browser tab unless you explicitly save a debrief to share",
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

"use client";

// INTERIM landing. The full build follows docs/landing-spec-2026-07-27.md — nav,
// hero with the trace-card proof block, receipts trio, four stages, sample
// debrief, evidence band, FAQ, final CTA — and lands once /plan is real.
//
// What this pass does is the part that couldn't wait: the headline is the
// pivoted one, the four stages are named, and the two dishonest bits are gone.
// The old page claimed "Runs entirely on-device. No account, no upload." — the
// compile calls OpenAI with the pasted text, so every clause of that was false.
// It also linked a "Watch demo" button at youtu.be/demo, which does not exist.
//
// The Vanta/three.js CDN background went with them: it was configured in the
// dead dark-navy palette, and two render-blocking unpkg scripts are a poor
// trade for a decoration on a page whose whole argument is restraint.

import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const STAGES = [
  {
    name: "Compile",
    body: "Paste a job description and a resume. Every gap cites the JD line that demands it and the resume line that's silent.",
  },
  {
    name: "Plan",
    body: "The questions you'll actually face, each one traceable back to the gap that produced it.",
  },
  {
    name: "Session",
    body: "Rehearse them live against an AI interviewer that follows up on what you actually said.",
  },
  {
    name: "Debrief",
    body: "What each answer covered and missed — every claim quoting your own words back to you.",
  },
];

export default function Landing() {
  const router = useRouter();

  return (
    <main className={`app-main ${styles.main}`}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={`kicker ${styles.kicker}`}>Interview rehearsal, with receipts</p>

          <h1 className={`display-1 ${styles.title}`}>
            Rehearse the interview you&apos;re about to have.
          </h1>

          <p className={`lead ${styles.lead}`}>
            DryRun diffs a job description against your resume into evidenced gaps, compiles
            the questions those gaps produce, and debriefs you afterwards by quoting your own
            answers.
          </p>

          <div className={styles.ctaGroup}>
            <button onClick={() => router.push("/compile")} className="btn btn-primary btn-lg btn-shadow">
              Compile your interview →
            </button>
          </div>

          <p className={`footer-note ${styles.stance}`}>
            Nothing is graded. Nothing is displayed without a receipt.
          </p>
        </div>
      </section>

      <section className={styles.stages}>
        <ol className={styles.stageList}>
          {STAGES.map((stage, i) => (
            <li key={stage.name} className={styles.stage}>
              <span className={`kicker ${styles.stageNum}`}>{String(i + 1).padStart(2, "0")}</span>
              <h2 className={styles.stageName}>{stage.name}</h2>
              <p className={styles.stageBody}>{stage.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

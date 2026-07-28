// FourStages — the numbered rail: Compile → Plan → Session → Debrief, one
// honest line each. No cards here (the receipts trio already used the card
// shape) — a rail with a connecting rule reads as one pipeline, not four
// products.

import styles from "./FourStages.module.css";

const STAGES = [
  {
    name: "Compile",
    body: "Paste a job description and a resume. Every gap cites the JD line that demands it and the resume line that’s silent.",
  },
  {
    name: "Plan",
    body: "Up to six questions compiled from the gaps, each one traceable back to the gap that produced it.",
  },
  {
    name: "Session",
    body: "Answer them live against an AI interviewer that follows up on what you actually said, capped at two follow-ups.",
  },
  {
    name: "Debrief",
    body: "What each answer covered and missed — every covered claim quoting your own words back to you.",
  },
] as const;

export default function FourStages() {
  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <p className="kicker">The four stages</p>

        <ol className={styles.rail}>
          {STAGES.map((stage, i) => (
            <li key={stage.name} className={styles.stage}>
              <div className={styles.stageHead}>
                <span className={`mono ${styles.num}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.name}>{stage.name}</span>
              </div>
              <p className={styles.body}>{stage.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

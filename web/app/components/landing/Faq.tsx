// Faq — four real questions. Built on native <details>/<summary> so it's an
// accordion with zero JS: no hooks, still server-rendered, still keyboard- and
// screen-reader-accessible for free.

import styles from "./Faq.module.css";

const FAQS = [
  {
    q: "Why no scores?",
    a: "Because an unprovable number is worse than no number. The debrief describes what an answer covered and what it missed, quoting your own words for every covered claim — never a score, a grade, or a readiness percentage.",
  },
  {
    q: "Where do my documents go?",
    a: "Nowhere, until you say so. The JD and resume you paste are held in your browser session; compiling sends them to the model that reads them, and nothing stores a copy ambiently. The one exception is the explicit “Save & share debrief” button, which writes a single debrief you choose to publish — anyone with the link can view it.",
  },
  {
    q: "Which AI interviews me?",
    a: "Agnes AI runs the interviewer lane by default. If a request to Agnes fails, the session automatically fails over to OpenAI, and the transcript labels which one actually answered — never silently.",
  },
  {
    q: "What exactly is a receipt?",
    a: "A verbatim span from a source document or transcript that’s mechanically re-checked to still match it. If a claim can’t be tied to one, it’s demoted to a visible dropped count instead of being shown.",
  },
];

export default function Faq() {
  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <p className="kicker">Questions</p>
        <h2 className={`display-2 ${styles.heading}`}>Honest answers, kept short.</h2>

        <div className={styles.list}>
          {FAQS.map((item) => (
            <details key={item.q} className={styles.item}>
              <summary className={styles.question}>
                {item.q}
                <span className={styles.marker} aria-hidden="true" />
              </summary>
              <p className={styles.answer}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

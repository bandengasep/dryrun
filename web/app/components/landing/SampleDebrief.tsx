// SampleDebrief — a labeled, static excerpt. The kicker says "sample" and the
// heading says "excerpt" because this is the one section of the page that
// could be mistaken for a testimonial if it weren't over-labeled — Honesty
// pillar, not a style choice.

import styles from "./SampleDebrief.module.css";

export default function SampleDebrief() {
  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <p className="kicker">A sample debrief &middot; static excerpt</p>
        <h2 className={`display-2 ${styles.heading}`}>What the debrief sounds like.</h2>
        <p className={styles.sub}>
          Not a live session &mdash; a fixed excerpt from one question, shown to demonstrate the
          shape of the feedback: what got covered, quoted; what got missed, named without a
          quote to invent.
        </p>

        <div className={styles.card}>
          <p className={`mono ${styles.question}`}>
            q-2 &middot; Tell me about a time you diagnosed a production outage under time
            pressure.
          </p>

          <div className={styles.row}>
            <span className={`${styles.tag} ${styles.tagCovered}`}>Covered</span>
            <div className={styles.rowBody}>
              <div className={styles.quoteChip}>
                <span className={`mono ${styles.quoteText}`}>
                  &ldquo;I wrote a reconciliation script that caught the drift before it hit
                  prod.&rdquo;
                </span>
                <span className={styles.quoteMeta}>turn 1</span>
              </div>
              <p className={styles.rowNote}>Names a concrete diagnostic action taken under pressure.</p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={`${styles.tag} ${styles.tagMissed}`}>Missed</span>
            <div className={styles.rowBody}>
              <p className={styles.rowNote}>
                Didn&rsquo;t say how long the outage lasted or how the fix was verified afterward
                &mdash; no quote is shown here because there is nothing in the transcript to cite.
              </p>
            </div>
          </div>
        </div>

        <p className={styles.footerNote}>
          No scores, no grades. Every covered claim above quotes the words that back it, or it
          isn&rsquo;t shown.
        </p>
      </div>
    </section>
  );
}

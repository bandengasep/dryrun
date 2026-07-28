// ReceiptsTrio — "how it works" in three cards, each carrying a hand-built
// mini-mock in the real visual language (kind chips, mono quotes, gapId
// receipts) rather than an abstract icon. Static JSX: none of this imports the
// live GapCard/QuestionCard components, which expect real CompileResult data
// this page doesn't have — but the colours, type, and shapes are the same ones
// those components use.

import styles from "./ReceiptsTrio.module.css";

export default function ReceiptsTrio() {
  return (
    <section id="how" className={styles.section}>
      <div className={styles.content}>
        <p className="kicker">How it works</p>
        <h2 className={`display-2 ${styles.heading}`}>Every stage hands the next one a receipt.</h2>

        <div className={styles.grid}>
          <article className={styles.card}>
            <p className={`kicker ${styles.cardKicker}`}>Compile</p>
            <p className={styles.cardBody}>
              JD and resume become atomic requirement and evidence lines, then a gap diff &mdash;
              every gap citing exactly the spans it was built from.
            </p>

            <div className={styles.mock}>
              <span className={`${styles.chip} ${styles.chipMissing}`}>
                <span className={styles.chipDot} />
                Missing skill
              </span>
              <p className={styles.mockTitle}>Kubernetes orchestration at scale</p>
              <div className={styles.mockRow}>
                <span className={styles.mockLabel}>JD L14</span>
                <span className={`mono ${styles.mockQuote}`}>
                  &ldquo;must have deployed and maintained production Kubernetes clusters serving
                  1M+ daily requests&rdquo;
                </span>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <p className={`kicker ${styles.cardKicker}`}>Plan</p>
            <p className={styles.cardBody}>
              Up to six questions, compiled from the gaps &mdash; conceptual for what&rsquo;s
              missing, behavioral with STAR hints for what&rsquo;s weakly evidenced.
            </p>

            <div className={styles.mock}>
              <div className={styles.mockQHead}>
                <span className={styles.mockQid}>q-2</span>
                <span className={styles.mockKind}>Behavioral</span>
              </div>
              <p className={styles.mockQuestion}>
                Tell me about a time you diagnosed a production outage under time pressure.
              </p>
              <div className={styles.mockRow}>
                <span className={styles.mockBecause}>because of</span>
                <span className={`mono ${styles.gapRefWeak}`}>gap-2 &middot; incident response</span>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <p className={`kicker ${styles.cardKicker}`}>Debrief</p>
            <p className={styles.cardBody}>
              Every &ldquo;covered&rdquo; claim quotes the transcript verbatim, re-located
              mechanically. What failed to re-locate is dropped, never displayed.
            </p>

            <div className={styles.mock}>
              <div className={styles.quoteChip}>
                <span className={`mono ${styles.quoteChipText}`}>
                  &ldquo;I wrote a reconciliation script that caught the drift before it hit
                  prod.&rdquo;
                </span>
                <span className={styles.quoteChipMeta}>turn 1</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

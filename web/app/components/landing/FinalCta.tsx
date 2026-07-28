// FinalCta — ink-blue shell, radius 40, 48px internal padding. The footer row
// names the repo as placeholder text, not a link — the repo isn't public yet,
// and a link to nowhere is the same kind of dishonest copy the interim page
// removed.

import Link from "next/link";
import styles from "./FinalCta.module.css";

export default function FinalCta() {
  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <div className={styles.shell}>
          <h2 className={`display-2 ${styles.heading}`}>Compile your interview.</h2>
          <p className={styles.sub}>
            Paste a job description and a resume. Nothing is graded, nothing is displayed
            without a receipt.
          </p>

          <Link href="/compile" className={`btn btn-lg ${styles.cta}`}>
            Compile your interview &rarr;
          </Link>

          <div className={styles.footerRow}>
            <span>open source &middot; built for the Launchpad challenge</span>
          </div>
        </div>
      </div>
    </section>
  );
}

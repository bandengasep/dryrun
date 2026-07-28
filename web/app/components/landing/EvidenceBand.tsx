// EvidenceBand — "the receipts": every locked success criterion from
// docs/spec-pivot-2026-07-26.md as Target | Measured. Where we have real
// numbers logged in docs/decision-log.md (27-28 Jul), we show them — misses
// included, styled as misses, not smoothed over. Everything else says
// "measured Thursday" rather than inventing a number to fill the cell.

import styles from "./EvidenceBand.module.css";

type Row = {
  metric: string;
  target: string;
  measured: string;
  status: "met" | "missed" | "pending";
};

const ROWS: Row[] = [
  {
    metric: "Displayed-question grounding",
    target: "100% by construction (≥95% pre-guard)",
    measured: "measured Thursday",
    status: "pending",
  },
  {
    metric: "Displayed debrief quotes valid",
    target: "100% by construction · dropped-rate <10%",
    measured: "measured Thursday",
    status: "pending",
  },
  {
    metric: "Gap-set consistency (20 runs/pair)",
    target: "mean pairwise Jaccard ≥0.6",
    measured: "measured Thursday",
    status: "pending",
  },
  {
    metric: "Gap precision / recall vs gold",
    target: "≥0.8 / ≥0.7",
    measured: "measured Thursday",
    status: "pending",
  },
  {
    metric: "Cost (compile / session)",
    target: "≤$0.05 / ≤$0.25 median",
    measured: "measured Thursday",
    status: "pending",
  },
  {
    metric: "Compile latency (p50)",
    target: "≤60s",
    measured: "99.65s, production — target missed, restating with evidence Thursday",
    status: "missed",
  },
  {
    metric: "Plan latency",
    target: "≤20s",
    measured: "measured Thursday",
    status: "pending",
  },
  {
    metric: "First-turn token",
    target: "≤3s",
    measured: "~6.2s — target missed, restating with evidence Thursday",
    status: "missed",
  },
  {
    metric: "Debrief latency",
    target: "≤45s",
    measured: "22.7s — target met",
    status: "met",
  },
  {
    metric: "Video quote→timestamp exact mapping",
    target: "≥90%",
    measured: "measured Thursday",
    status: "pending",
  },
  {
    metric: "Zero-shot baseline uncited rate",
    target: "reported side-by-side",
    measured: "measured Thursday",
    status: "pending",
  },
];

export default function EvidenceBand() {
  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <p className="kicker">The receipts</p>
        <h2 className={`display-2 ${styles.heading}`}>
          What we measured before we called this done.
        </h2>
        <p className={styles.sub}>
          Every target below was locked on 26 Jul, before any of this was built. Rows still
          reading &ldquo;measured Thursday&rdquo; are not yet run &mdash; they are not hidden or
          assumed.
        </p>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Metric</th>
                <th className={styles.th}>Target</th>
                <th className={styles.th}>Measured</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.metric} className={styles.tr}>
                  <td className={styles.tdMetric}>{row.metric}</td>
                  <td className={`mono ${styles.tdTarget}`}>{row.target}</td>
                  <td className={`mono ${styles.tdMeasured} ${styles[row.status]}`}>
                    {row.measured}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles.footnote}>
          Numbers update from evals/results/ before submission &mdash; targets were locked
          before building.
        </p>
      </div>
    </section>
  );
}

// EvidenceBand — "the receipts": every locked success criterion from
// docs/spec-pivot-2026-07-26.md as Target | Measured. Final numbers, 31 Jul:
// mirrors the README Evidence table; misses and non-measurements are styled
// as what they are, not smoothed over. Sources: evals/results/ + the
// decision log (latency program + gpt-5.6-luna adoption, 2026-07-31).

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
    measured: "pre-guard 29/29 across 5 pairs (30/30 on the adopted engine); displayed rate guard-enforced",
    status: "met",
  },
  {
    metric: "Displayed debrief quotes valid",
    target: "100% by construction · dropped-rate <10%",
    measured: "every quote a literal slice of the candidate's turn, 0 dropped (live sessions, disclosed n)",
    status: "met",
  },
  {
    metric: "Gap-set consistency (20 runs/pair)",
    target: "mean pairwise Jaccard ≥0.6",
    measured: "0.881 / 0.770 on the adopted engine (0.794 / 0.900 baseline)",
    status: "met",
  },
  {
    metric: "Gap precision / recall vs gold",
    target: "≥0.8 / ≥0.7",
    measured: "not measured — descoped 30 Jul; protocol + review sheets committed, CI-green",
    status: "pending",
  },
  {
    metric: "Cost (compile / session)",
    target: "≤$0.05 / ≤$0.25 median",
    measured: "not captured — token counts reported; ≈$0.035/compile derivable at posted rates",
    status: "pending",
  },
  {
    metric: "Compile latency (p50)",
    target: "≤60s",
    measured: "16.6–19.1s fixture · 40–45s real JD, production 31 Jul (was 99.65s / 146.3s)",
    status: "met",
  },
  {
    metric: "Plan latency",
    target: "≤20s",
    measured: "9.4–11.0s production 31 Jul (was 33.4s)",
    status: "met",
  },
  {
    metric: "First-turn token",
    target: "≤3s",
    measured: "6.9–9.2s — still missed after a 41% prompt trim; partner-gateway-bound, restated",
    status: "missed",
  },
  {
    metric: "Debrief latency",
    target: "≤45s",
    measured: "6.9s production 31 Jul (22.7s baseline)",
    status: "met",
  },
  {
    metric: "Video quote→timestamp exact mapping",
    target: "≥90%",
    measured: "lane no-go'd at its pre-committed gate; substrate dormant, 14 passing tests",
    status: "pending",
  },
  {
    metric: "Zero-shot baseline uncited rate",
    target: "reported side-by-side",
    measured: "0.0% audited re-run (100/100 verbatim) · 1.03% on 28 Jul — see the README",
    status: "met",
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
          Every target below was locked on 26 Jul, before any of this was built. The engine
          model was upgraded on 31 Jul only after passing these same gates &mdash; the two
          &ldquo;not measured&rdquo; rows are exactly that, not hidden misses.
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
          Final as of 31 Jul, from evals/results/ and production probes &mdash; targets were
          locked before building; the full table with sources lives in the README.
        </p>
      </div>
    </section>
  );
}

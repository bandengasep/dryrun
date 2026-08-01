// Hero — kicker, Fraunces H1, lead, dual CTA, and a hand-built compile-trace
// proof block (NOT the real StageTrace component: this is a static mock that
// never has to be true, so it never risks lying about a run in progress).
//
// No hooks in this file itself — Hero stays server-renderable; the Vanta
// canvas is its own "use client" leaf (VantaBackground) so only that node
// hydrates. The dimmed trace texture drifting behind the copy is still pure
// CSS (one keyframe, no animation library, respects prefers-reduced-motion).

import Link from "next/link";
import VantaBackground from "./VantaBackground";
import styles from "./Hero.module.css";

const TRACE_LINE = [
  "$ dryrun compile --jd venture-jd.txt --resume timothy.pdf",
  "✓ parse jd · 21 requirement lines · 0 dropped",
  "✓ parse resume · 14 evidence lines · 0 dropped",
  "▸ diff gap-1 · missing_skill · jd L3 ↔ resume silent",
  "▸ diff gap-2 · weak_evidence · jd L9 ↔ resume L4",
  "▸ diff gap-3 · strong_differentiator · jd L12 ↔ resume L2",
  "✓ compile session plan · 6 questions · 6/6 gapId resolved",
  "✓ debrief · 5 covered · 9 missed · 0 dropped",
].join("\n");

// Repeated so the drift never reveals empty space at the edges of the frame.
const TRACE_TEXT = Array.from({ length: 6 }, () => TRACE_LINE).join("\n");

export default function Hero() {
  return (
    <section className={styles.hero}>
      <VantaBackground />
      <pre className={styles.traceTexture} aria-hidden="true">
        {TRACE_TEXT}
      </pre>
      <div className={styles.fade} aria-hidden="true" />
      {/* Scrim: the Vanta mesh + trace texture read as clutter directly behind
          the headline without it — darkest under the copy, sheer enough at the
          right edge that the animation still shows through. */}
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.content}>
        <p className={`kicker ${styles.kicker}`}>Rehearsal compiler · every claim carries a receipt</p>

        <h1 className={`display-1 ${styles.title}`}>
          Rehearse the interview you&rsquo;re about to have.
        </h1>

        <p className={`lead ${styles.lead}`}>
          Paste a job description and a resume. DryRun diffs them into evidenced gaps &mdash;
          every gap citing the JD line that demands it and the resume line that&rsquo;s silent
          &mdash; then compiles the questions those gaps predict, and debriefs you afterwards by
          quoting your own answers back to you.
        </p>

        <div className={styles.ctaGroup}>
          <Link href="/compile" className="btn btn-primary btn-lg btn-shadow">
            Compile your interview &rarr;
          </Link>
          <a href="#how" className="btn btn-outline btn-lg">
            See how it works
          </a>
        </div>

        <div className={styles.traceCard} aria-hidden="true">
          <div className={styles.traceCardHead}>
            <span className={styles.traceCardDot} />
            <span className={`mono ${styles.traceCardLabel}`}>compile trace</span>
          </div>
          <div className={styles.traceCardBody}>
            <p className={`mono ${styles.traceRow} ${styles.traceDone}`}>
              &#10003; parse jd &middot; 21 requirement lines &middot; 0 dropped
            </p>
            <p className={`mono ${styles.traceRow} ${styles.traceDone}`}>
              &#10003; parse resume &middot; 14 evidence lines &middot; 0 dropped
            </p>
            <p className={`mono ${styles.traceRow} ${styles.traceActive}`}>
              <span className={styles.caret}>&#9656;</span> diff gaps &mdash; adjudicating&hellip;
            </p>
            <p className={`mono ${styles.traceRow} ${styles.tracePending}`}>
              &middot; compile session plan
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

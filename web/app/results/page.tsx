"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { animate, motionValue, stagger, type AnimationSequence } from "motion";
import styles from "./results.module.css";

const READINESS_PERCENT = 65;

const challenges = [
  {
    id: "sql-1",
    lang: "SQL",
    tab: "sql",
    difficulty: "Medium",
    title: "Build a Scalable Query",
    blurb: "Write an optimized SQL query to fetch user activity data with joins and aggregations.",
    reason: "Addresses weak evidence in SQL + system design gap.",
    runnable: true,
  },
  {
    id: "py-1",
    lang: "Python",
    tab: "python",
    difficulty: "Hard",
    title: "Implement Graph Traversal",
    blurb: "Write a graph traversal algorithm with memoization for efficient path finding.",
    reason: "Directly targets missing algorithms & data structure skills.",
    runnable: true,
  },
  {
    id: "sys-1",
    lang: "System Design",
    tab: "design",
    difficulty: "Hard",
    title: "Design a Scalable API",
    blurb: "Design a REST API architecture for a high-traffic service with database and cache layers.",
    reason: "Bridges missing system design and architecture expertise.",
    runnable: false,
  },
];

function tagClass(lang: string) {
  if (lang === "Python") return styles.tagPython;
  if (lang === "SQL") return styles.tagSql;
  if (lang === "System Design") return styles.tagDesign;
  return styles.tagDefault;
}

export default function ResultsScreen() {
  const router = useRouter();
  const [displayPercent, setDisplayPercent] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const statRefs = useRef<(HTMLDivElement | null)[]>([]);

  const openChallenge = (lang: string) => {
    router.push(`/compiler/${lang.toLowerCase()}`);
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const statEls = statRefs.current.filter((el): el is HTMLDivElement => el !== null);

    if (prefersReducedMotion) {
      setDisplayPercent(READINESS_PERCENT);
      if (barRef.current) barRef.current.style.width = `${READINESS_PERCENT}%`;
      statEls.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    if (!barRef.current) return;

    // Explicit MotionValue for the percent counter, so we can unsubscribe/stop it directly on cleanup.
    const progress = motionValue(0);
    const unsubscribe = progress.on("change", (v) => setDisplayPercent(Math.round(v)));

    // Single Motion timeline: bar fill and percent counter run together,
    // stat cards stagger in just before the counter finishes.
    const sequence: AnimationSequence = [
      [barRef.current, { width: ["0%", `${READINESS_PERCENT}%`] }, { duration: 1.1, ease: "easeOut" }],
      [progress, [0, READINESS_PERCENT], { duration: 1.1, ease: "easeOut", at: "<" }],
    ];
    if (statEls.length > 0) {
      sequence.push([
        statEls,
        { opacity: [0, 1], transform: ["translateY(16px)", "translateY(0px)"] },
        { duration: 0.45, delay: stagger(0.12), at: "-0.4" },
      ]);
    }
    const controls = animate(sequence);

    return () => {
      unsubscribe();
      controls.stop();
    };
  }, []);

  return (
    <main className="app-main">
      <div className={styles.content}>
        {/* Readiness gauge */}
        <div className={styles.gauge}>
          <div className={styles.gaugeHeader}>
            <span className={styles.gaugeLabel}>Interview readiness</span>
            <span className={styles.gaugeValue}>{displayPercent}%</span>
          </div>
          <div className={styles.gaugeTrack}>
            <div ref={barRef} className={styles.gaugeFill} />
          </div>
        </div>

        {/* Stats row */}
        <div className={styles.statsGrid}>
          {[
            { n: 4, label: "ready", colorClass: styles.statGreen },
            { n: 3, label: "to sharpen", colorClass: styles.statAmber },
            { n: 2, label: "missing", colorClass: styles.statRed },
          ].map((stat, i) => (
            <div
              key={stat.label}
              ref={(el) => {
                statRefs.current[i] = el;
              }}
              className={styles.statCard}
            >
              <div className={`${styles.statNumber} ${stat.colorClass}`}>{stat.n}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Suggested challenges section */}
        <h2 className={styles.sectionTitle}>Suggested challenges</h2>
        <p className={styles.sectionSubtext}>Generated from your gaps, ranked by interview priority.</p>

        {/* Challenge cards */}
        {challenges.map((c) => (
          <div key={c.id} className={styles.card}>
            {/* Card header */}
            <div className={styles.cardHeader}>
              <div className={`${styles.tag} ${tagClass(c.lang)}`}>
                <span className={styles.tagText}>{c.lang}</span>
              </div>
              <span className={styles.cardDifficulty}>{c.difficulty}</span>
            </div>

            {/* Card title */}
            <div className={styles.cardTitle}>{c.title}</div>

            {/* Card blurb */}
            <div className={styles.cardBlurb}>{c.blurb}</div>

            {/* Reason */}
            <div className={styles.cardReason}>◦ {c.reason}</div>

            {/* Action button */}
            {c.runnable ? (
              <button
                onClick={() => openChallenge(c.lang)}
                className={`btn btn-primary btn-block ${styles.cardActionButton}`}
              >
                Open in compiler  ▸
              </button>
            ) : (
              <div className={styles.cardActionDisabled}>Generated · prompt only</div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

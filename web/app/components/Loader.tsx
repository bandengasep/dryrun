"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "motion";

interface LoaderProps {
  label?: string;
}

export default function Loader({ label = "Loading…" }: LoaderProps) {
  const dotsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const dots = dotsRef.current.filter((el): el is HTMLSpanElement => el !== null);
    if (dots.length === 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const controls = animate(
      dots,
      { scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] },
      { duration: 0.9, repeat: Infinity, delay: stagger(0.15), ease: "easeInOut" }
    );

    return () => controls.stop();
  }, []);

  return (
    <div className="loader-overlay">
      <div className="loader-card">
        <div className="loader-dots">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              ref={(el) => {
                dotsRef.current[i] = el;
              }}
              className="loader-dot"
            />
          ))}
        </div>
        {label && <p className="loader-label">{label}</p>}
      </div>
    </div>
  );
}

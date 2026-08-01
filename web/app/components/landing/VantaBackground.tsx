"use client";

// Isolated as its own client component so Hero itself stays a plain,
// server-renderable function — only this leaf needs the mount ref + effect
// that VANTA.NET requires. Importing Vanta lazily avoids any browser-only
// library execution during SSR and keeps the landing page from depending on
// a global build-time VANTA shim.
import { useEffect, useRef } from "react";
import styles from "./VantaBackground.module.css";

type VantaEffect = { destroy: () => void };

export default function VantaBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<VantaEffect | null>(null);

  useEffect(() => {
    if (!hostRef.current || effectRef.current) return;

    let cancelled = false;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    void (async () => {
      const [THREE, vantaModule] = await Promise.all([
        import("three"),
        import("vanta/dist/vanta.net.min"),
      ]);
      if (cancelled || !hostRef.current) return;

      const NET = (vantaModule as unknown as { default: (opts: any) => VantaEffect }).default;
      effectRef.current = NET({
        el: hostRef.current,
        THREE,
        mouseControls: !prefersReducedMotion,
        touchControls: !prefersReducedMotion,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        showDots: false,
        backgroundColor: 0x212959,
        color: 0x5470c7,
        points: 9.0,
        maxDistance: 22.0,
        spacing: 18.0,
      });
    })();

    return () => {
      cancelled = true;
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className={styles.vanta} aria-hidden="true" />;
}

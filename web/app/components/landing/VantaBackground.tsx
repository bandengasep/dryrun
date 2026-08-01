"use client";

// Isolated as its own client component so Hero itself stays a plain,
// server-renderable function — only this leaf needs the mount ref + effect
// that VANTA.NET requires. Importing Vanta lazily avoids any browser-only
// library execution during SSR and keeps the landing page from depending on
// a global build-time VANTA shim.
//
// Dark theme only, and that is a cost decision as much as a design one.
// three.js is a 712 KB client chunk; gating the dynamic import on the active
// theme means the default (light) journey never requests it, so nobody pays for
// a decoration they aren't being shown. The mesh is also the worst case for
// video compression — thin high-contrast lines on a flat dark field — which is
// a second reason it stays off the default path. See decision-log 2026-08-02.

import { useEffect, useRef } from "react";
import { useTheme } from "../ThemeContext";
import styles from "./VantaBackground.module.css";

type VantaEffect = { destroy: () => void };

export default function VantaBackground() {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<VantaEffect | null>(null);

  useEffect(() => {
    // Nothing is imported, fetched, or constructed unless dark is active. On a
    // dark → light switch this returns after the cleanup below has already torn
    // the effect down.
    if (theme !== "dark") return;
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
  }, [theme]);

  // Unmounting the host on light is what triggers the cleanup above; the WebGL
  // context is released rather than left running behind a hidden node.
  if (theme !== "dark") return null;

  return <div ref={hostRef} className={styles.vanta} aria-hidden="true" />;
}

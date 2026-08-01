"use client";

// Isolated as its own client component so Hero itself stays a plain,
// server-renderable function — only this leaf needs the mount ref + effect
// that VANTA.NET requires. Importing Vanta lazily avoids any browser-only
// library execution during SSR and keeps the landing page from depending on
// a global build-time VANTA shim.
//
// Runs in BOTH themes, recoloured per theme, so the two grounds read as the
// same product rather than two different sites (Timothy's call, 2 Aug — see
// decision-log). That costs the 712 KB three.js chunk on the default light
// path, which the dark-only gate had avoided; the import stays dynamic so it
// never blocks first paint — the hero renders from CSS and the mesh arrives
// after.
//
// Vanta paints its own opaque ground, so `backgroundColor` has to match the
// theme's hero gradient origin or the canvas cuts a visible rectangle out of
// the page.

import { useEffect, useRef } from "react";
import { useTheme, type Theme } from "../ThemeContext";
import styles from "./VantaBackground.module.css";

type VantaEffect = { destroy: () => void };

// Line colour is picked for equal *weight*, not equal contrast: on navy the
// lines sit above the ground, on paper they sit below it, and matching the
// hex ratios would make the light mesh far louder than the dark one.
const PALETTE: Record<Theme, { backgroundColor: number; color: number }> = {
  dark: { backgroundColor: 0x212959, color: 0x5470c7 },
  light: { backgroundColor: 0xd2dcee, color: 0xf7faff },
};

export default function VantaBackground() {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<VantaEffect | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

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
        points: 9.0,
        maxDistance: 22.0,
        spacing: 18.0,
        ...PALETTE[theme],
      });
    })();

    // Re-keyed on theme: switching tears the WebGL context down and builds a
    // new one in the other palette rather than leaving a stale-coloured canvas.
    return () => {
      cancelled = true;
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, [theme]);

  return <div ref={hostRef} className={styles.vanta} aria-hidden="true" />;
}

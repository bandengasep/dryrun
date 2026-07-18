"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import logoImg from "./assets/logo-img.png";
import styles from "./page.module.css";

const BRAND_TEXT = "Dry Run";
const BRAND_TAG = `<${BRAND_TEXT}>`;

function CodeTag({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} className={ch === "<" || ch === ">" ? styles.tagBracket : undefined}>
          {ch}
        </span>
      ))}
    </>
  );
}

export default function Landing() {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState<"login" | "signup" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [vantaLoaded, setVantaLoaded] = useState(false);
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!threeLoaded || !vantaLoaded || !vantaRef.current || vantaEffect.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const w = window as unknown as { VANTA: { NET: (opts: Record<string, unknown>) => { destroy: () => void } } };

    vantaEffect.current = w.VANTA.NET({
      el: vantaRef.current,
      mouseControls: !prefersReducedMotion,
      touchControls: !prefersReducedMotion,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0x22d3ee, // --color-cyan
      backgroundColor: 0x0a0f1c, // --color-bg
      points: prefersReducedMotion ? 4.0 : 9.0,
      maxDistance: prefersReducedMotion ? 0 : 20.0,
      spacing: 18.0,
      showDots: true,
    });

    return () => {
      vantaEffect.current?.destroy();
      vantaEffect.current = null;
    };
  }, [threeLoaded, vantaLoaded]);

  const [typedBrand, setTypedBrand] = useState("");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setTypedBrand(BRAND_TAG);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTypedBrand(BRAND_TAG.slice(0, i));
      if (i >= BRAND_TAG.length) clearInterval(interval);
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const handleAuthSubmit = () => {
    // Placeholder auth logic
    setShowAuthModal(null);
    setAuthEmail("");
    setAuthPassword("");
  };

  return (
    <main className={`app-main ${styles.main}`}>
      {/* Animated background */}
      <Script
        src="https://unpkg.com/three@0.134.0/build/three.min.js"
        strategy="afterInteractive"
        onLoad={() => setThreeLoaded(true)}
      />
      {threeLoaded && (
        // Vanta's UMD bundle reads window.THREE at parse time, so it must not
        // even start loading until three.min.js has set that global.
        <Script
          src="https://unpkg.com/vanta@0.5.24/dist/vanta.net.min.js"
          strategy="afterInteractive"
          onLoad={() => setVantaLoaded(true)}
        />
      )}

      <div ref={vantaRef} className={styles.animatedBg} />

      {/* Header */}
      <header className="site-header">
        {/* Logo */}
        <button className="logo" onClick={() => router.push("/")}>
          <img src={logoImg.src} alt="Dry Run logo" className="logo-img" />
          <span className="logo-text">
            <CodeTag text={BRAND_TAG} />
          </span>
        </button>

        {/* Nav tabs */}
        <div className="nav-tabs">
          {[
            { label: "Home", path: "/" },
            { label: "About", path: "/about" },
            { label: "Interview Compiler", path: "/compile" },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.path)}
              className={`nav-tab ${tab.label === "Home" ? "nav-tab-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="auth-buttons">
          <button onClick={() => setShowAuthModal("login")} className="btn btn-outline btn-sm">
            Login
          </button>
          <button onClick={() => setShowAuthModal("signup")} className="btn btn-primary btn-sm">
            Sign up
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className={styles.heroSection}>
        <div className={styles.heroInner}>
          {/* Brand logo */}
          <img src={logoImg.src} alt="Dry Run logo" className={styles.heroLogoImg} />

          {/* Brand text */}
          <h1 className={styles.heroTitle}>
            <CodeTag text={typedBrand} />
            <span className={styles.typeCursor}>▌</span>
          </h1>

          {/* Subheading */}
          <p className={styles.subheading}>Turn a job description into targeted interview practice.</p>

          {/* Description */}
          <p className={styles.description}>
            Paste a JD and your resume. Dry Run diffs them into evidenced gaps — every gap citing the JD line that
            demands it and the resume line that&apos;s silent — then generates personalized coding and system design
            challenges.
          </p>

          {/* CTA Buttons */}
          <div className={styles.ctaGroup}>
            <button
              onClick={() => router.push("/compile")}
              className="btn btn-primary btn-lg btn-block btn-shadow"
            >
              Start an interview →
            </button>

            <button
              onClick={() => window.open("https://youtu.be/demo", "_blank")}
              className="btn btn-outline btn-lg btn-block"
            >
              Watch demo
            </button>
          </div>

          {/* Footer note */}
          <p className="footer-note">Runs entirely on-device. No account, no upload.</p>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{showAuthModal === "login" ? "Login" : "Sign up"}</h2>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
              />
            </div>

            <div className="form-group form-group-last">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
              />
            </div>

            <div className="modal-actions">
              <button onClick={handleAuthSubmit} className="btn btn-primary btn-block btn-modal">
                {showAuthModal === "login" ? "Login" : "Sign up"}
              </button>

              <button onClick={() => setShowAuthModal(null)} className="btn btn-outline btn-block btn-modal">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./about.module.css";
import logoImg from "../assets/logo-img.png";

export default function About() {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState<"login" | "signup" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const handleAuthSubmit = () => {
    setShowAuthModal(null);
    setAuthEmail("");
    setAuthPassword("");
  };

  return (
    <main className="app-main">
      {/* Header */}
      <header className="site-header">
        {/* Logo */}
        <button className="logo" onClick={() => router.push("/")}>
          <img src={logoImg.src} alt="Dry Run logo" className="logo-img" />
          <span className="logo-text">Dry Run</span>
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
              className={`nav-tab ${tab.label === "About" ? "nav-tab-active" : ""}`}
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

      {/* Content */}
      <div className={styles.content}>
        <h1 className={styles.pageTitle}>About Dry Run</h1>

        <div className={styles.sections}>
          <section>
            <h2 className={styles.sectionTitle}>The Problem</h2>
            <p className={styles.sectionText}>
              Every job interview starts the same way: you hunt through generic question banks and try to guess what
              the interviewer will ask. You don&apos;t know your real gaps — where the job demands something
              you&apos;re weak on. So you prep everything, waste weeks, and still walk into the room unprepared.
            </p>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Our Solution</h2>
            <p className={styles.sectionText}>
              Paste a job description and your resume. Dry Run diffs them into evidenced gaps — every gap cites the
              exact line from the JD that demands it and the exact line (or silence) from your resume that speaks to
              it. Then we compile personalized coding, SQL, and system design challenges directly from those gaps.
            </p>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>How It Works</h2>
            <div className={styles.stepsGrid}>
              {[
                { num: "1", title: "Paste", desc: "Upload a JD and your resume" },
                { num: "2", title: "Diff", desc: "We extract gaps with receipts" },
                { num: "3", title: "Compile", desc: "Generate personalized challenges" },
                { num: "4", title: "Practice", desc: "Run code, sharpen your skills" },
              ].map((step) => (
                <div key={step.num} className={styles.stepCard}>
                  <div className={styles.stepBadge}>{step.num}</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Key Features</h2>
            <ul className={styles.featureList}>
              {[
                "On-device processing — no uploads, no account needed",
                "Evidence-based gaps — every claim is traceable to the source",
                "Executable challenges — all SQL and code runs in a sandbox",
                "Real-time feedback — see what works, what doesn't",
                "Targeted practice — focus only on what matters for your target role",
              ].map((feature) => (
                <li key={feature} className={styles.featureItem}>
                  <span className={styles.checkMark}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>
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

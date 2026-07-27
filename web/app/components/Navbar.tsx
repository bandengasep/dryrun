"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useStageAvailability } from "../lib/session-state";
import { ROUTE_READY } from "../lib/routes";

// The tabs are the product's four stages, in the order they happen. A stage you
// haven't reached yet is disabled rather than hidden: seeing that a rehearsal
// and a debrief come after the compile is most of the explanation of what this
// is, and hiding them would cost that for no benefit.
const TABS = [
  { label: "Compile", path: "/compile", stage: null },
  { label: "Plan", path: "/plan", stage: "plan" },
  { label: "Session", path: "/session", stage: "session" },
  { label: "Debrief", path: "/debrief", stage: "debrief" },
] as const;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const availability = useStageAvailability();
  const { isLoggedIn, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState<"login" | "signup" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const handleAuthSubmit = () => {
    // Cosmetic only — there is no account system, and nothing about a rehearsal
    // is stored against one. It resolves instantly rather than faking a network
    // delay: a spinner that measures nothing is the same lie as a progress bar
    // that measures nothing.
    login();
    setShowAuthModal(null);
    setAuthEmail("");
    setAuthPassword("");
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <header className="site-header">
        <button className="logo" onClick={() => router.push("/")}>
          <span className="logo-dot" aria-hidden="true" />
          <span className="logo-text">dryrun</span>
        </button>

        <nav className="nav-tabs" aria-label="Stages">
          {TABS.map((tab) => {
            const reachable = tab.stage === null || availability[tab.stage];
            const active = pathname.startsWith(tab.path);
            // Say which of the two reasons it is — "finish the previous stage"
            // is misleading advice when the route simply isn't built yet.
            const why =
              tab.stage !== null && tab.stage !== "plan" && !ROUTE_READY[tab.stage]
                ? `${tab.label} isn't in this build yet`
                : `${tab.label} unlocks once the previous stage is done`;
            return (
              <button
                key={tab.label}
                onClick={() => router.push(tab.path)}
                disabled={!reachable}
                aria-current={active ? "page" : undefined}
                title={reachable ? undefined : why}
                className={`nav-tab ${active ? "nav-tab-active" : ""}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {isLoggedIn ? (
          <div className="profile-menu">
            <button className="profile-trigger" aria-label="Account menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </button>
            <div className="profile-dropdown">
              <button onClick={handleLogout} className="profile-dropdown-item">
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-buttons">
            <button onClick={() => setShowAuthModal("login")} className="btn btn-outline btn-sm">
              Login
            </button>
            <button onClick={() => setShowAuthModal("signup")} className="btn btn-primary btn-sm">
              Sign up
            </button>
          </div>
        )}
      </header>

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

            <p className="footer-note" style={{ marginBottom: 0, marginTop: "var(--spacing-4)" }}>
              Accounts are a placeholder — nothing is stored against one. Your
              rehearsal stays in this tab either way.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

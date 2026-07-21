"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthContext";
import Loader from "./Loader";
import logoImg from "../assets/logo-img.png";

const TABS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Interview Compiler", path: "/compile" },
];

function isTabActive(tabPath: string, pathname: string) {
  if (tabPath === "/") return pathname === "/";
  if (tabPath === "/compile") {
    return pathname.startsWith("/compile") || pathname.startsWith("/compiler") || pathname.startsWith("/results");
  }
  return pathname.startsWith(tabPath);
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { isLoggedIn, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState<"login" | "signup" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthSubmit = () => {
    setIsAuthenticating(true);
    // Placeholder delay standing in for a real auth call — swap for the actual request later.
    setTimeout(() => {
      login();
      setIsAuthenticating(false);
      setShowAuthModal(null);
      setAuthEmail("");
      setAuthPassword("");
    }, 3000);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
    setShowAuthModal("login");
  };

  return (
    <>
      <header className="site-header">
        {/* Logo */}
        <button className="logo" onClick={() => router.push("/")}>
          <img src={logoImg.src} alt="Dry Run logo" className="logo-img" />
          <span className="logo-text">Dry Run</span>
        </button>

        {/* Nav tabs */}
        <div className="nav-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.path)}
              className={`nav-tab ${isTabActive(tab.path, pathname) ? "nav-tab-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Auth buttons / Profile menu */}
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
              <button
                onClick={handleAuthSubmit}
                disabled={isAuthenticating}
                className="btn btn-primary btn-block btn-modal"
              >
                {showAuthModal === "login" ? "Login" : "Sign up"}
              </button>

              <button
                onClick={() => setShowAuthModal(null)}
                disabled={isAuthenticating}
                className="btn btn-outline btn-block btn-modal"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthenticating && (
        <Loader label={showAuthModal === "signup" ? "Creating your account…" : "Signing you in…"} />
      )}
    </>
  );
}

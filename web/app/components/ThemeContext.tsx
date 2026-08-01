"use client";

// Theme selection. Two values only — there is no "system" option on purpose.
//
// The locked theme is "Reading Room daylight" (decision-log 2026-07-27), and
// two of the reasons it won were about how the product is *seen*: it should not
// look like the uniformly dark AI-tool field, and light survives video
// compression better. Honouring prefers-color-scheme would hand that decision
// to whatever the visitor's OS happens to be set to, so we don't read it. Light
// is what you get until you ask for dark, and then we remember that you did.
//
// Storage is localStorage, not the sessionStorage that session-state.tsx uses.
// That file's reasoning — a resume must not linger on a shared machine — is
// about document content. A theme preference is not document content, and a
// preference that forgets itself on every tab close isn't a preference. See
// decision-log 2026-08-02.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { THEME_STORAGE_KEY, type Theme } from "../lib/theme";

export type { Theme };

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

/** Mirrors THEME_INIT_SCRIPT in lib/theme.ts, which runs before first paint. */
function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always "light" on the server and on the first client render, which is what
  // the markup says. The effect below reconciles with whatever the blocking
  // script already put on <html>, so React state catches up to the DOM rather
  // than the DOM flashing to catch up to React.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      setThemeState(stored);
      applyTheme(stored);
    }
  }, []);

  const setTheme = (next: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
    setThemeState(next);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// Deliberately NOT a "use client" module.
//
// layout.tsx is a server component and needs THEME_STORAGE_KEY to build the
// blocking init script. Exports of a "use client" module reach a server
// component as client references rather than as their values, so the key has to
// live somewhere neutral that both sides can import for real.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "dryrun-theme-v1";

/**
 * The pre-hydration theme script, shared so the string exists in exactly one
 * place. Runs before first paint and only ever *adds* the attribute: light is
 * the default and needs no work, so the no-preference path costs nothing.
 * Kept in sync with applyTheme() in components/ThemeContext.tsx.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="dark"){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})()`;

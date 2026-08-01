"use client";

// Two segments, both always visible, rather than one icon that swaps to mean
// "the other thing". Built from Paper "Dryrun-WebApp" → Page 2, artboard
// "theme toggle — states".

import { useTheme, type Theme } from "./ThemeContext";

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" />
      <path d="M8 1.4v1.6M8 13v1.6M14.6 8h-1.6M3 8H1.4M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4L3.3 3.3" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.9 5.9 0 1 0 7 7Z" />
    </svg>
  );
}

const OPTIONS: { value: Theme; label: string; Icon: () => React.ReactElement }[] = [
  { value: "light", label: "Daylight theme", Icon: SunIcon },
  { value: "dark", label: "After-hours theme", Icon: MoonIcon },
];

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    // A radiogroup rather than a switch: there are two named choices, and
    // aria-checked on each says which one is live.
    <div className={`theme-toggle ${className}`} role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={`theme-toggle-option ${active ? "theme-toggle-option-active" : ""}`}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}

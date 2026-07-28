"use client";

// Who's actually answering, disclosed rather than hidden — the Agnes/OpenAI
// failover is a labeled fact, never a silent swap (AGENTS.md rule 4). Renders
// nothing until the `provider` SSE event actually names someone; there is no
// "connecting…" placeholder state here on purpose, since guessing who will
// answer before the first token exists would be the thing this component
// exists to avoid.

import styles from "./ProviderChip.module.css";

export interface ProviderChipInfo {
  name: string;
  model: string;
  failover: boolean;
}

export default function ProviderChip({ provider }: { provider: ProviderChipInfo | null }) {
  if (!provider) return null;
  return (
    <span className={`mono ${styles.chip}`}>
      <span
        className={`${styles.dot} ${provider.failover ? styles.failover : styles.ok}`}
        aria-hidden="true"
      />
      interviewer: {provider.model}
      {provider.failover ? " · failover" : ""}
    </span>
  );
}

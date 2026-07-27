"use client";

// The gap-kind pill: dot + wide-tracked caps on a 10%-alpha tint of the kind's
// own colour. Paper: "GapCard-Missing-Expanded" head / "GapRow-Weak".

import type { GapKind } from "@dryrun/core";
import { KIND_LABEL } from "../lib/receipts";
import styles from "./GapKindChip.module.css";

export default function GapKindChip({ kind }: { kind: GapKind }) {
  return (
    <span className={`${styles.chip} ${styles[kind]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {KIND_LABEL[kind]}
    </span>
  );
}

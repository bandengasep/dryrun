import type { Gap } from "@dryrun/core";

// Proof that the shared receipts contract flows backend → frontend in one language:
// this `Gap` type is the exact type the diff engine emits. Vedika's compile-trace UI
// will render real Gap[] here; for now it's an empty, compiler-checked placeholder.
const gaps: Gap[] = [];

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 48, maxWidth: 720 }}>
      <h1>DryRun — the interview compiler</h1>
      <p>
        Paste a job description and a resume; DryRun diffs them into evidenced gaps —
        each citing the JD line that demands it and the resume line that&apos;s silent.
      </p>
      <p style={{ opacity: 0.6 }}>Compile-trace UI coming soon. Gaps loaded: {gaps.length}.</p>
    </main>
  );
}

// A shared, read-only debrief. Server component — no "use client", no session
// hook, no fetch: the row is loaded once on the server via loadSession, and
// DebriefView (a client component) renders straight from that data. This is
// the one surface in the product where the source of truth is the database
// row rather than sessionStorage, because a link handed to someone else has
// no browser tab to read from.

import type { SavedSession } from "@dryrun/core";
import { loadSession, SessionStoreError } from "../../lib/sessions";
import DebriefView from "../../components/DebriefView";
import styles from "../debrief.module.css";

export default async function SharedDebriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let session: SavedSession | null;
  try {
    session = await loadSession(id);
  } catch (e) {
    const message =
      e instanceof SessionStoreError ? e.message : e instanceof Error ? e.message : String(e);
    return (
      <main className="app-main">
        <div className={styles.content}>
          <p className="kicker">Shared debrief</p>
          <h1 className={`display-2 ${styles.title}`}>This debrief can&apos;t be shown</h1>
          <p className={`lead ${styles.subtitle}`}>{message}</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-main">
        <div className={styles.content}>
          <p className="kicker">Shared debrief</p>
          <h1 className={`display-2 ${styles.title}`}>Nothing here</h1>
          <p className={`lead ${styles.subtitle}`}>
            This link doesn&apos;t point to a saved debrief — it may never have been saved.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main">
      <div className={styles.content}>
        <span className={styles.sharedBanner}>Shared debrief · read-only · anyone with the link can view</span>
        <DebriefView plan={session.plan} transcript={session.transcript} debrief={session.debrief} readOnly />
      </div>
    </main>
  );
}

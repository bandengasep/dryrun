import { NextResponse } from "next/server";
import { SavedSession } from "@dryrun/core";
import { SessionStoreError, saveSession } from "../../../lib/sessions";

export const maxDuration = 30;

/**
 * Persist a finished session so it can be shared by link.
 *
 * This is the ONLY server-side write in the product, and it happens only when
 * the user clicks "Save & share debrief" — the button that also states that
 * anyone with the link can view it. Everything else in DryRun is client-held
 * and disappears with the tab.
 *
 * Write-once: there is no update and no delete path, so a shared link cannot be
 * altered after it is handed out.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Validated before it is stored: this row outlives the session that made it,
  // and a malformed debrief would only fail later, on someone else's screen.
  const parsed = SavedSession.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Can't save this session: ${parsed.error.issues[0]?.message ?? "unknown"}` },
      { status: 400 },
    );
  }

  try {
    const id = await saveSession(parsed.data);
    return NextResponse.json({ id, url: `/debrief/${id}` });
  } catch (e) {
    if (e instanceof SessionStoreError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

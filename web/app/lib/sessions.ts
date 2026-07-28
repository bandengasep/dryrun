// The one place DryRun writes to a server.
//
// SERVER ONLY. Never import this from a client component: it reads
// SUPABASE_SECRET_KEY, which bypasses row-level security. The `sessions` table
// has RLS enabled with NO policies, so the publishable key can neither read nor
// write it — every read and write is mediated here, on purpose. "Anyone with the
// link can view" is then a property of this route's behaviour, not of a public
// table policy that could later be widened by accident.
//
// Ground rule 3: in-flight session state is client-held (sessionStorage). The
// only server write is the user clicking "Save & share debrief". Nothing is
// stored unless they do.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SavedSession } from "@dryrun/core";

const TABLE = "sessions";

export class SessionStoreError extends Error {}

/**
 * Built per request so `next build` never needs credentials, matching how the
 * OpenAI clients are constructed.
 */
function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new SessionStoreError(
      "Saving is not configured on this deployment (SUPABASE_URL / SUPABASE_SECRET_KEY missing).",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Write once, return the id that becomes the shareable link. */
export async function saveSession(session: SavedSession): Promise<string> {
  const { data, error } = await client()
    .from(TABLE)
    .insert({
      plan: session.plan,
      transcript: session.transcript,
      debrief: session.debrief,
    })
    .select("id")
    .single();

  if (error) throw new SessionStoreError(error.message);
  if (!data?.id) throw new SessionStoreError("Save returned no id.");
  return String(data.id);
}

/**
 * Read a shared session, or null when the id doesn't exist.
 *
 * The row is re-validated against the schema rather than trusted: it was written
 * by an older build the moment we ship a second one, and a shared debrief that
 * renders half-broken is worse than one that says it can't be loaded.
 */
export async function loadSession(id: string): Promise<SavedSession | null> {
  const { data, error } = await client()
    .from(TABLE)
    .select("plan, transcript, debrief")
    .eq("id", id)
    .maybeSingle();

  // An invalid uuid is a bad link, not an outage.
  if (error) {
    if (error.code === "22P02") return null;
    throw new SessionStoreError(error.message);
  }
  if (!data) return null;

  const parsed = SavedSession.safeParse(data);
  if (!parsed.success) {
    throw new SessionStoreError(
      "This shared debrief was saved in an incompatible format and can't be displayed.",
    );
  }
  return parsed.data;
}

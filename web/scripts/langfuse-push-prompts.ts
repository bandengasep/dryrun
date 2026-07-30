// Upserts DryRun's three compile-time system prompts into Langfuse Prompt
// Management, labeled "production":
//   dryrun/plan-compile      <- PLAN_SYSTEM_PROMPT     (packages/core/src/plan)
//   dryrun/interviewer       <- PERSONA                (packages/core/src/session)
//   dryrun/debrief-compile   <- DEBRIEF_SYSTEM_PROMPT  (packages/core/src/debrief)
//
// These are REFERENCE copies for browsing/diffing/experimenting in the
// Langfuse UI. This script does NOT wire runtime prompt fetching into the
// app — deliberate: adding a network round-trip to fetch a prompt on the
// compile/plan/debrief/session critical path is a new failure mode and a new
// latency cost the demo does not need, for a hackathon build where the
// prompts are not iterated on by anyone outside this repo. The constants in
// packages/core/src/{plan,session,debrief} remain the single source of truth
// actually sent to the model; re-run this script by hand after editing them
// to keep the Langfuse copies in sync.
//
// Run (from web/, so @langfuse/client and @dryrun/core resolve from this
// workspace's node_modules):
//   cd web && npx tsx scripts/langfuse-push-prompts.ts
// (tsx is intentionally not a project dependency — npx fetches/caches it on
// demand, matching AGENTS.md's sanctioned-dependency discipline: this script
// runs by hand, rarely, so it doesn't earn a permanent devDependency.)
//
// Requires LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_BASE_URL.
// Loads them from web/.env.local if present (same values as repo-root .env
// per AGENTS.md rule 8); no-ops with an explanatory message if they're absent
// rather than throwing, so this is safe to run speculatively.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const envLocalPath = resolve(import.meta.dirname, "../.env.local");
if (existsSync(envLocalPath)) process.loadEnvFile(envLocalPath);

async function main() {
  if (
    !process.env.LANGFUSE_PUBLIC_KEY ||
    !process.env.LANGFUSE_SECRET_KEY ||
    !process.env.LANGFUSE_BASE_URL
  ) {
    console.log(
      "[langfuse-push-prompts] LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_BASE_URL not set — nothing to push.",
    );
    return;
  }

  const { LangfuseClient } = await import("@langfuse/client");
  const { PLAN_SYSTEM_PROMPT, PERSONA, DEBRIEF_SYSTEM_PROMPT } = await import("@dryrun/core");

  const langfuse = new LangfuseClient();

  const prompts: { name: string; prompt: string }[] = [
    { name: "dryrun/plan-compile", prompt: PLAN_SYSTEM_PROMPT },
    { name: "dryrun/interviewer", prompt: PERSONA },
    { name: "dryrun/debrief-compile", prompt: DEBRIEF_SYSTEM_PROMPT },
  ];

  for (const { name, prompt } of prompts) {
    await langfuse.prompt.create({
      name,
      type: "text",
      prompt,
      labels: ["production"],
    });
    console.log(`[langfuse-push-prompts] upserted ${name} (${prompt.length} chars)`);
  }

  console.log("[langfuse-push-prompts] done.");
}

main().catch((e) => {
  console.error("[langfuse-push-prompts] failed:", e);
  process.exitCode = 1;
});
